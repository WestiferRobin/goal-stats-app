"""Only runs inside the runner's fresh, uniquely named disposable database."""
import json
import hashlib
import os
from pathlib import Path
import re
import time
from datetime import datetime, UTC
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text
from sqlalchemy.engine import make_url
from infra.resources.db import Database
from football.team_ratings import SOURCE_SHA
from settings.environment import load_application

session = os.environ.get('NORMALIZED_SESSION', '')
assert re.fullmatch('[0-9a-f]{32}', session), 'Owned session required'
url = make_url(os.environ['DATABASE_URL'])
assert url.host == 'postgres' and url.database == 'goalstats_test_' + session
assert url.username == 'goalstats_test' and os.environ['APP_ENV'] == 'test'
database = Database(load_application().database)
for attempt in range(60):
    try:
        with database.engine.connect() as connection:
            assert connection.scalar(text('SELECT current_database()')) == url.database
        break
    except Exception:
        if attempt == 59:
            raise
        time.sleep(1)
assert inspect(database.engine).get_table_names() == [], 'Refusing nonempty database'
# Reuse the checksum-verified read-only mount for runtime historical reconstruction.
# This path exists only inside this disposable runner; no developer data is changed.
assert hashlib.sha256(Path('/source/results.csv').read_bytes()).hexdigest() == SOURCE_SHA
bootstrap = Path('/service/data/bootstrap')
bootstrap.mkdir(exist_ok=True)
(bootstrap / 'results.csv').symlink_to('/source/results.csv')
os.chdir('/service')
config = Config('/service/alembic.ini')
command.upgrade(config, 'head')
from main import create_app
from football.historical_dataset import APPROVED_DATASETS
from football.historical_import import import_historical_dataset
from settings.database import ImportTarget
for dataset in APPROVED_DATASETS:
    import_historical_dataset(database, Path('/source'), ImportTarget('test', 'postgres', url.database), dataset_id=dataset, dry_run=False)
app = create_app()
client = app.test_client()

def get(path):
    response = client.get('/api/v1/' + path)
    assert response.status_code == 200, (path, response.status_code)
    return response.json

teams = {team['name']: team['team_id'] for team in get('catalog/teams')}
assert len(teams) == 44
# Replay the committed verification values only into this owned disposable database.
# These are test fixtures, not a new official ranking release or a recomputed cohort.
import csv
from datetime import date
from decimal import Decimal
from models.enrichment import RankingRelease, RankingObservation, FifaTeamMapping, RatingRun, TeamRating
fixture_path = Path('/service/data/verification/teams-enrichment-2026-11-15.csv')
fixture_hash = hashlib.sha256(fixture_path.read_bytes()).hexdigest()
with fixture_path.open() as source_file:
    profiles = list(csv.DictReader(source_file))
assert len(profiles) == 44 and {row['team'] for row in profiles} == set(teams)
with database.transaction() as db:
    db.add(RankingRelease(release_id='owned-verification-fixture', published_on=date(2026, 10, 20),
        retrieved_at=datetime.now(UTC), source_url='fixture://committed-enrichment-verification',
        sha256=fixture_hash, index_sha256=fixture_hash, release_metadata={'test_fixture': True}))
    db.add(RatingRun(run_id=fixture_hash, cutoff=date(2026, 6, 10),
        model_version='owned-verification-fixture', source_sha256=fixture_hash,
        source_url='fixture://committed-enrichment-verification', report={'test_fixture': True}))
    db.flush()
    for profile in profiles:
        identity = teams[profile['team']]
        db.add(FifaTeamMapping(team_id=identity, fifa_team_id=profile['fifa_team_id'], source_name=profile['team']))
        db.add(RankingObservation(release_id='owned-verification-fixture', fifa_team_id=profile['fifa_team_id'],
            rank=int(profile['fifa_rank']), points=Decimal(profile['fifa_points']), status=0, raw={'test_fixture': True}))
        db.add(TeamRating(run_id=fixture_hash, team_id=identity,
            **{field: float(profile[field]) if profile[field] else None for field in ['offense', 'defense', 'form']},
            evidence={'reason': None if profile['availability'] == 'available_experimental' else profile['availability'], 'last_match': profile['latest_match'], 'matches': int(profile['matches']), 'form_matches': int(profile['form_matches'])}))
profiles = get('catalog/teams')
assert sum(all(row[field] is not None for field in ['offense', 'defense', 'form']) for row in profiles) == 43
assert all(row['fifa_rank'] is not None and row['fifa_points'] is not None for row in profiles)
Path('/artifacts/enrichment-fixture.json').write_text(json.dumps({'source': str(fixture_path), 'sha256': fixture_hash, 'teams': 44, 'complete_ratings': 43}))
assert len(get('catalog/competitions')) == 9
matches = sum((get(f'catalog/matches?limit=200&offset={offset}') for offset in [0,200]), [])
assert len(matches) == 348
assert sum(row['home_score'] + row['away_score'] for row in matches) == 1081
for name, expected in [('United States', [54,41,9,4,142,39,103,9]), ('Germany',[47,31,6,10,129,42,87,9]), ('Spain',[14,7,2,5,24,15,9,3])]:
    summary = get(f'catalog/teams/{teams[name]}/summary')
    assert [summary[key] for key in ['matches_played','wins','draws','losses','goals_for','goals_against','goal_difference','tournament_appearances']] == expected
# Real backend contract checks against the generated numerical fixtures.
cases = json.loads(Path('/app/src/lib/fixtures/backend-v2-predictions.json').read_text())
for case in cases:
    body = {**case['request'], 'team1_shots': 4, 'team1_id':teams['China'], 'team2_id':teams['Norway']}
    response = client.post('/api/v1/predictions/preview', json=body)
    assert response.status_code == 200
    assert response.json == case['output']
assert get('scenarios') == [], 'Preview must not persist'
# One explicit synthetic mixed-version scenario: unchanged frozen v1 mathematics,
# remapped catalog names/IDs and owned scenario envelope. No historical facts altered.
legacy = json.loads(Path('/app/src/lib/fixtures/frozen-v1-prediction.json').read_text())
from schemas.scenario import ScenarioCreate
body = {key:value for key,value in legacy['input_snapshot'].items() if key in ScenarioCreate.model_fields}
body.update(team1_id=teams['China'], team2_id=teams['Norway'], title='Owned mixed-version browser fixture', match_id=None)
response = client.post('/api/v1/scenarios', json=body)
assert response.status_code == 201
scenario = response.json
snapshot = {**scenario, 'adapter_version':'scenario-v1', 'extra_minute':0, 'status':''}
from models.prediction import Prediction
output = legacy['output']
excluded = {'team1','team2','minute','status','model','probabilities','expected_goals_remaining','most_likely_score'}
with database.transaction() as db:
    row = Prediction(scenario_id=scenario['scenario_id'], generated_at=datetime(2020,1,1,tzinfo=UTC),
        model_version=output['model'], team1_win_probability=output['probabilities']['team1'],
        draw_probability=output['probabilities']['draw'], team2_win_probability=output['probabilities']['team2'],
        team1_expected_remaining_goals=output['expected_goals_remaining']['team1'],
        team2_expected_remaining_goals=output['expected_goals_remaining']['team2'],
        most_likely_team1_score=output['most_likely_score'][0], most_likely_team2_score=output['most_likely_score'][1],
        input_snapshot=snapshot, details={key:value for key,value in output.items() if key not in excluded})
    db.add(row)
    db.flush()
    legacy_id = row.prediction_id
for _ in range(49):
    response = client.post(f"/api/v1/scenarios/{scenario['scenario_id']}/predictions")
    assert response.status_code == 201
assert len(get(f"scenarios/{scenario['scenario_id']}/predictions?limit=50&offset=0")) == 50
assert get(f"scenarios/{scenario['scenario_id']}/predictions?limit=50&offset=50") == []
receipt = {'session':session, 'database':url.database, 'teams':teams, 'mixed_scenario_id':scenario['scenario_id'], 'legacy_prediction_id':legacy_id}
Path('/tmp/goalstats-normalized.json').write_text(json.dumps(receipt))
Path('/artifacts/seed.json').write_text(json.dumps(receipt, indent=2))
print('Backend contract checks PASS: 44 teams, 9 editions, 348 matches, 1081 goals; three known summaries; five exact v2 previews; read-only previews; 50 mixed-history records.')
app.extensions['goalstats_database'].dispose()
app.extensions['goalstats_cache'].close()
database.dispose()
