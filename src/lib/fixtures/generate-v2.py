"""Regenerate offline: PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=../goal-stats-service/src ../goal-stats-service/.venv/bin/python -B src/lib/fixtures/generate-v2.py

Uses backend b6143a407c42e3f616c05a9e6632615f6c0f8b9e's real engine,
service capture normalization and response schemas. No app/database is created.
IDs, names, timestamps and hypothetical inputs are synthetic; numerical outputs
and reasoning come exclusively from the backend. Frozen v1 is read, never changed.
"""
import json
from pathlib import Path
from football.scenario_prediction import predict_inputs
from schemas.prediction import SavedPredictionResponse
from schemas.prediction.request import PredictionPreview
from schemas.scenario import ScenarioResponse
from services.prediction import PredictionService

folder = Path(__file__).resolve().parent
base = json.loads((folder / 'frozen-v1-prediction.json').read_text())['input_snapshot']
cases = []
for minute, score in [(89, (1, 0)), (90, (1, 0)), (91, (1, 1)), (105, (0, 2)), (120, (2, 2))]:
    values = {k: v for k, v in base.items() if k in ScenarioResponse.model_fields}
    values.update(scenario_id=7, team1_id=1, team2_id=2, team1_name='China', team2_name='Norway',
                  match_minute=minute, team1_goals=score[0], team2_goals=score[1],
                  team1_shots=0, team1_shots_on_target=4, team1_fifa_rank=None, team2_fifa_rank=None,
                  team1_modifier_total=0, team2_modifier_total=0, title=None, match_id=None)
    scenario = ScenarioResponse.model_validate(values).model_dump(mode='json')
    request = PredictionPreview.model_validate({k:v for k,v in scenario.items() if k in PredictionPreview.model_fields}).model_dump(mode='json')
    effective = PredictionService._capture(scenario)
    output = predict_inputs(effective)
    saved = SavedPredictionResponse(prediction_id=minute, scenario_id=7,
        generated_at='2026-11-13T12:00:00Z', model_version=output['model'],
        input_snapshot=effective, output=output).model_dump(mode='json')
    cases.append(dict(minute=minute, request=request, scenario=scenario, output=saved['output'], saved=saved))
(folder / 'backend-v2-predictions.json').write_text(json.dumps(cases, indent=2) + '\n')
