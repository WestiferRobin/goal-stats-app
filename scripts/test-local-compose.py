"""Read-only Compose regression checks; no services are created or started."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class LocalComposeTests(unittest.TestCase):
    def resolve(self, origin, token=''):
        env = {**os.environ, 'FOOTBALL_API_BASE_URL': origin,
               'SERVICE_API_TOKEN': token, 'APP_PORT': '3001'}
        output = subprocess.check_output([
            'docker', 'compose', '--env-file', '.env.example', '-p', 'goalstats-config-check',
            '-f', 'docker/compose.local.yml', 'config', '--format', 'json'],
            cwd=ROOT, env=env, text=True)
        return json.loads(output)['services']['app']

    def test_local_host_and_port(self):
        app = self.resolve('http://host.docker.internal:5100')
        self.assertEqual(app['environment']['FOOTBALL_API_BASE_URL'], 'http://host.docker.internal:5100')
        self.assertEqual(app['environment']['GOALSTATS_LOCAL_DOCKER'], '1')
        self.assertEqual(app['ports'][0]['published'], '3001')
        self.assertEqual(app['ports'][0]['host_ip'], '127.0.0.1')
        # Compose 2.22 serializes ':'; newer releases normalize the separator to '='.
        hosts = [entry.replace('=', ':', 1) for entry in app['extra_hosts']]
        self.assertIn('host.docker.internal:host-gateway', hosts)

    def test_docker_origin_cannot_inherit_native_or_remote_namespace(self):
        token = 'dummy-compose-test-token-not-a-secret'
        app = self.resolve('https://backend.example.invalid', token)
        self.assertEqual(app['environment']['FOOTBALL_API_BASE_URL'], 'http://host.docker.internal:5100')
        self.assertEqual(app['environment']['SERVICE_API_TOKEN'], token)
        self.assertNotIn('NEXT_PUBLIC_SERVICE_API_TOKEN', app['environment'])

if __name__ == '__main__':
    unittest.main()
