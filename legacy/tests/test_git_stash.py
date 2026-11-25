from unittest.mock import MagicMock
import pytest

from biscuit.git.repo import GitRepo


class TestGitStash:
    def test_stash_push_default(self):
        repo = GitRepo.__new__(GitRepo)
        repo.git = MagicMock()
        repo.master = MagicMock()
        repo.base = MagicMock()

        repo.stash()

        repo.git.stash.assert_called_once_with("push")
        repo.master.update_repo_info.assert_called_once()

    def test_stash_push_with_message_and_keep_index(self):
        repo = GitRepo.__new__(GitRepo)
        repo.git = MagicMock()
        repo.master = MagicMock()
        repo.base = MagicMock()

        repo.stash(message="WIP test", keep_index=True)

        repo.git.stash.assert_called_once_with("push", "--keep-index", "-m", "WIP test")
        repo.master.update_repo_info.assert_called_once()

    def test_stash_pop(self):
        repo = GitRepo.__new__(GitRepo)
        repo.git = MagicMock()
        repo.master = MagicMock()
        repo.base = MagicMock()

        repo.stash_pop(1)

        repo.git.stash.assert_called_once_with("pop", "stash@{1}")
        repo.master.update_repo_info.assert_called_once()

    def test_stash_apply(self):
        repo = GitRepo.__new__(GitRepo)
        repo.git = MagicMock()
        repo.master = MagicMock()
        repo.base = MagicMock()

        repo.stash_apply(0)

        repo.git.stash.assert_called_once_with("apply", "stash@{0}")
        repo.master.update_repo_info.assert_called_once()

    def test_stash_drop(self):
        repo = GitRepo.__new__(GitRepo)
        repo.git = MagicMock()
        repo.master = MagicMock()
        repo.base = MagicMock()

        repo.stash_drop(2)

        repo.git.stash.assert_called_once_with("drop", "stash@{2}")
        repo.master.update_repo_info.assert_called_once()

    def test_stash_list(self):
        repo = GitRepo.__new__(GitRepo)
        repo.git = MagicMock()
        repo.git.stash.return_value = "stash@{0}: WIP on main\nstash@{1}: WIP on feat\n"

        res = repo.stash_list()

        assert res == ["stash@{0}: WIP on main", "stash@{1}: WIP on feat"]
