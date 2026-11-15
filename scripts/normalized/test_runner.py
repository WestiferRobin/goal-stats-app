"""Host-only runner regressions using disposable Git repositories, never Docker."""
import hashlib
import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location(
    'normalized_runner', Path(__file__).resolve().parents[1] / 'test-normalized.py'
)
runner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runner)


class RepositoryStateTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()

    def git(self, repo, *args):
        return subprocess.check_output(
            ['git', '-C', str(repo), *args], text=True, stderr=subprocess.PIPE
        ).strip()

    def repository(self, name='repo', branch='feature/arbitrary-name', committed=True):
        repo = self.root / name
        repo.mkdir()
        self.git(repo, 'init', '-q', '--initial-branch=' + branch)
        if committed:
            (repo / 'tracked.txt').write_text('original\n')
            self.git(repo, 'add', 'tracked.txt')
            self.git(repo, '-c', 'user.name=Runner Test', '-c', 'user.email=runner@example.test',
                     '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null',
                     'commit', '-qm', 'Fixture')
        return repo

    def test_arbitrary_branches_record_paths_and_commits(self):
        for index, branch in enumerate(['feature/arbitrary-name', 'release/2027.1', 'experiment_42']):
            with self.subTest(branch=branch):
                repo = self.repository(str(index), branch)
                state = runner.repository_state(repo)
                self.assertEqual(state['path'], str(repo))
                self.assertEqual(state['branch'], branch)
                self.assertEqual(state['head'], self.git(repo, 'rev-parse', 'HEAD'))
                self.assertFalse(state['detached_head'])
                self.assertEqual(state['status'], '')

    def test_detached_head_is_accepted_and_explicit(self):
        repo = self.repository()
        head = self.git(repo, 'rev-parse', 'HEAD')
        # Detach only this disposable fixture; the runner never changes HEAD.
        self.git(repo, 'update-ref', '--no-deref', 'HEAD', head)
        state = runner.repository_state(repo)
        self.assertIsNone(state['branch'])
        self.assertTrue(state['detached_head'])
        self.assertEqual(state['head'], head)
        self.assertEqual((repo / '.git/HEAD').read_text().strip(), head)

    def test_missing_repository_fails_clearly_without_git(self):
        with patch.object(runner, 'command') as command:
            with self.assertRaisesRegex(RuntimeError, 'Repository directory is missing:'):
                runner.repository_state(self.root / 'missing')
            command.assert_not_called()

    def test_non_repository_and_unborn_head_fail_clearly(self):
        plain = self.root / 'plain'
        plain.mkdir()
        for repo in (plain, self.repository(committed=False)):
            with self.subTest(repo=repo):
                with self.assertRaisesRegex(RuntimeError, 'Git worktree with a committed HEAD'):
                    runner.repository_state(repo)

    def test_nested_directory_is_not_mistaken_for_repository(self):
        repo = self.repository()
        nested = repo / 'nested'
        nested.mkdir()
        with self.assertRaisesRegex(RuntimeError, 'Expected a Git repository root:'):
            runner.repository_state(nested)

    def test_linked_worktree_is_accepted(self):
        repo = self.repository()
        linked = self.root / 'linked'
        self.git(repo, 'worktree', 'add', '-q', '-b', 'topic/linked', str(linked))
        state = runner.repository_state(linked)
        self.assertEqual(state['path'], str(linked))
        self.assertEqual(state['branch'], 'topic/linked')

    def test_dirty_state_is_recorded_without_checkout_or_git_mutation(self):
        repo = self.repository()
        (repo / 'tracked.txt').write_text('staged\n')
        self.git(repo, 'add', 'tracked.txt')
        (repo / 'tracked.txt').write_text('unstaged\n')
        (repo / 'untracked.txt').write_text('untracked\n')
        before = {name: (repo / '.git' / name).read_bytes() for name in ['HEAD', 'index']}
        refs = self.git(repo, 'show-ref')
        status = self.git(repo, 'status', '--porcelain')
        diff = self.git(repo, 'diff', 'HEAD')
        with patch.object(runner, 'command', wraps=runner.command) as command:
            state = runner.repository_state(repo)
        self.assertEqual(state['status'], status)
        self.assertEqual(state['tracked_diff_sha256'], hashlib.sha256(diff.encode()).hexdigest())
        self.assertEqual(refs, self.git(repo, 'show-ref'))
        self.assertEqual(before, {name: (repo / '.git' / name).read_bytes() for name in before})
        self.assertEqual([call.args[3:] for call in command.call_args_list], [
            ('rev-parse', '--show-toplevel'), ('rev-parse', '--verify', 'HEAD^{commit}'),
            ('branch', '--show-current'), ('status', '--porcelain'), ('diff', 'HEAD'),
        ])

    def test_missing_git_has_clear_error(self):
        with patch.object(runner, 'command', side_effect=FileNotFoundError):
            with self.assertRaisesRegex(RuntimeError, 'Git is required'):
                runner.repository_state(self.root)

    def test_main_records_both_repositories_before_existing_source_validation(self):
        app = self.repository('app', 'feature/ui')
        service = self.repository('service', 'experiment/api')
        artifacts = self.root / 'artifacts'
        original = runner.command

        def command(*args, **kwargs):
            if args[0] == 'git':
                return original(*args, **kwargs)
            if args == ('docker', 'info', '--format', '{{.ServerVersion}}'):
                return 'test-version'
            if args == ('docker', 'volume', 'ls', '-q'):
                return 'existing-volume'
            self.fail(f'Unexpected Docker operation: {args}')

        with patch.multiple(runner, ROOT=app, BACKEND=service, ARTIFACTS=artifacts):
            with patch.object(runner, 'command', side_effect=command):
                with self.assertRaisesRegex(RuntimeError, 'Approved committed CSV is missing'):
                    runner.main()
        baseline = json.loads((artifacts / 'baseline.json').read_text())
        self.assertEqual(baseline['baseline_volumes'], ['existing-volume'])
        for repo, branch in [(app, 'feature/ui'), (service, 'experiment/api')]:
            self.assertEqual(baseline['repositories'][repo.name]['branch'], branch)
            self.assertEqual(baseline['repositories'][repo.name]['path'], str(repo))
            self.assertEqual(baseline['repositories'][repo.name]['head'],
                             self.git(repo, 'rev-parse', 'HEAD'))

    def test_missing_backend_fails_before_docker_or_artifacts(self):
        app = self.repository('app')
        artifacts = self.root / 'artifacts'
        with patch.multiple(runner, ROOT=app, BACKEND=self.root / 'missing', ARTIFACTS=artifacts):
            with patch.object(runner, 'command', wraps=runner.command) as command:
                with self.assertRaisesRegex(RuntimeError, 'Repository directory is missing:'):
                    runner.main()
                self.assertTrue(all(call.args[0] == 'git' for call in command.call_args_list))
        self.assertFalse(artifacts.exists())

    def test_cleanup_still_refuses_unowned_resources(self):
        for kind in ['container', 'network']:
            with self.subTest(kind=kind):
                data = {'Labels': {runner.LABEL: 'another-session'}}
                if kind == 'container':
                    data = {'Config': data}
                with patch.object(runner, 'command', return_value=json.dumps([data])):
                    with self.assertRaisesRegex(RuntimeError, 'ownership label changed'):
                        runner.inspect_owned(kind, 'test-resource')


if __name__ == '__main__':
    unittest.main()
