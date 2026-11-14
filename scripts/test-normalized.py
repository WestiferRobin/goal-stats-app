#!/usr/bin/env python3
"""Owned, port-free Docker integration runner. Never reads .env.local."""
import json
import hashlib
import os
from pathlib import Path
import signal
import subprocess
import sys
import uuid

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT.parent / 'goal-stats-service'
TOKEN = uuid.uuid4().hex
PROJECT = 'goalstats-normalized-' + TOKEN
ARTIFACTS = ROOT / 'artifacts' / PROJECT
LABEL = 'org.goalstats.normalized-session'
containers = []
images = []
network = None


def command(*args, capture=False):
    result = subprocess.run(args, cwd=ROOT, check=True, text=True,
                            stdout=subprocess.PIPE if capture else None)
    return result.stdout.strip() if capture else None


def inspect_owned(kind, identity):
    data = json.loads(command('docker', kind, 'inspect', identity, capture=True))[0]
    labels = data.get('Config', {}).get('Labels', {}) if kind == 'container' else data.get('Labels', {})
    if labels.get(LABEL) != TOKEN:
        raise RuntimeError('Refusing cleanup: ownership label changed')


def launch(name, *args):
    identity = command('docker', 'create', '--name', PROJECT + '-' + name,
                       '--label', LABEL + '=' + TOKEN, '--network', PROJECT, *args, capture=True)
    containers.append(identity)
    command('docker', 'start', identity)
    return identity


def main():
    global network
    for repo in (ROOT, BACKEND):
        if command('git', '-C', str(repo), 'branch', '--show-current', capture=True) != 'member/wes':
            raise RuntimeError(f'{repo.name} must already be on member/wes')
    command('docker', 'info', '--format', '{{.ServerVersion}}')
    ARTIFACTS.mkdir(parents=True, exist_ok=False)
    baseline = command('docker', 'volume', 'ls', '-q', capture=True).splitlines()
    metadata = {'project': PROJECT, 'baseline_volumes': baseline, 'repositories': {}}
    for repo in (ROOT, BACKEND):
        metadata['repositories'][repo.name] = {
            'head': command('git', '-C', str(repo), 'rev-parse', 'HEAD', capture=True),
            'status': command('git', '-C', str(repo), 'status', '--porcelain', capture=True),
            'tracked_diff_sha256': hashlib.sha256(command('git', '-C', str(repo), 'diff', 'HEAD', capture=True).encode()).hexdigest()}
    (ARTIFACTS / 'baseline.json').write_text(json.dumps(metadata, indent=2))
    source = BACKEND / 'data/raw/martj42-womens-results/1855e313ae8bcd0330426e62c8e4cf15ce45077c'
    if not (source / 'results.csv').is_file():
        raise RuntimeError('Approved committed CSV is missing')
    service_image, test_image = PROJECT + '-service', PROJECT + '-browser'
    images.extend([service_image, test_image])
    command('docker', 'build', '--target', 'runtime', '-t', service_image, str(BACKEND))
    command('docker', 'build', '-f', 'docker/normalized.Dockerfile', '--build-arg',
            'NORMALIZED_SERVICE_IMAGE=' + service_image, '-t', test_image, '.')
    network = command('docker', 'network', 'create', '--label', LABEL + '=' + TOKEN, PROJECT, capture=True)
    password = uuid.uuid4().hex
    database = 'goalstats_test_' + TOKEN
    launch('postgres', '--network-alias', 'postgres', '--tmpfs', '/var/lib/postgresql/data',
           '-e', 'POSTGRES_USER=goalstats_test', '-e', 'POSTGRES_PASSWORD=' + password,
           '-e', 'POSTGRES_DB=' + database,
           'postgres:17-alpine@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73')
    launch('redis', '--network-alias', 'redis', '--tmpfs', '/data',
           'redis:7.4-alpine@sha256:ff02b58f971e7d7d156a1267e283fcbbeee91773b6aa36c49dac28ecfe28eadf',
           'redis-server', '--save', '', '--appendonly', 'no')
    identity = command('docker', 'create', '--name', PROJECT + '-runner', '--label', LABEL + '=' + TOKEN,
        '--network', PROJECT, '--init', '--shm-size=1g',
        '--mount', f'type=bind,source={ARTIFACTS},target=/artifacts',
        '--mount', f'type=bind,source={source},target=/source,readonly',
        '-e', 'NORMALIZED_SESSION=' + TOKEN, '-e', 'APP_ENV=test',
        '-e', f'DATABASE_URL=postgresql+psycopg://goalstats_test:{password}@postgres:5432/{database}',
        '-e', 'REDIS_URL=redis://redis:6379/0', '-e', 'FOOTBALL_API_BASE_URL=http://127.0.0.1:5100',
        test_image, capture=True)
    containers.append(identity)
    command('docker', 'start', '-a', identity)
    status = command('docker', 'inspect', '--format', '{{.State.ExitCode}}', identity, capture=True)
    if status != '0':
        raise RuntimeError(f'Browser runner exited {status}; see {ARTIFACTS}')


if __name__ == '__main__':
    signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(KeyboardInterrupt()))
    status = 0
    try:
        main()
    except (Exception, KeyboardInterrupt) as exc:
        print(f'Normalized suite failed: {exc}', file=sys.stderr)
        status = 1
    finally:
        for identity in reversed(containers):
            try:
                inspect_owned('container', identity)
                with (ARTIFACTS / (identity[:12] + '.log')).open('w') as log:
                    subprocess.run(['docker', 'logs', identity], stdout=log, stderr=subprocess.STDOUT, check=False)
                command('docker', 'rm', '-f', '-v', identity)
            except Exception as exc:
                print(f'Cleanup failure: {exc}', file=sys.stderr)
                status = 1
        if network:
            try:
                inspect_owned('network', network)
                command('docker', 'network', 'rm', network)
            except Exception as exc:
                print(f'Network cleanup failure: {exc}', file=sys.stderr)
                status = 1
        for image in reversed(images):
            subprocess.run(['docker', 'image', 'rm', image], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if ARTIFACTS.exists():
            baseline_file = ARTIFACTS / 'baseline.json'
            if baseline_file.exists():
                before = set(json.loads(baseline_file.read_text())['baseline_volumes'])
                after = set(command('docker', 'volume', 'ls', '-q', capture=True).splitlines())
                if not before <= after:
                    status = 1
                (ARTIFACTS / 'cleanup.json').write_text(json.dumps({'exit_code': status, 'baseline_volumes_preserved': before <= after, 'owned_containers': containers}, indent=2))
            print(f'Artifacts: {ARTIFACTS}')
    sys.exit(status)
