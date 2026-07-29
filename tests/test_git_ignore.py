import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest

from biscuit.git.ignore import GitIgnore


class TestGitIgnore:
    @pytest.fixture
    def git_ignore(self, mock_base):
        git = MagicMock()
        git.base = mock_base
        git.repo = MagicMock()
        gi = GitIgnore.__new__(GitIgnore)
        gi.git = git
        gi.base = mock_base
        gi.path = ""
        gi.repo = git.repo
        return gi

    def test_init(self, mock_base):
        git = MagicMock()
        git.base = mock_base
        gi = GitIgnore(git)
        assert gi.git == git

    def test_load_no_git(self, git_ignore):
        git_ignore.base.git_found = False
        git_ignore.load()
        assert git_ignore.path == ""

    def test_load_with_git(self, git_ignore):
        git_ignore.base.git_found = True
        git_ignore.base.active_directory = "/tmp"
        git_ignore.load()
        expected = os.path.join("/tmp", ".gitignore")
        assert git_ignore.path == expected

    def test_check_no_git(self, git_ignore):
        git_ignore.base.git_found = False
        result = git_ignore.check(["file.py"])
        assert result == []

    def test_check_with_git(self, git_ignore):
        git_ignore.base.git_found = True
        git_ignore.git.repo.ignored.return_value = ["file.py"]
        result = git_ignore.check(["file.py"])
        assert result == ["file.py"]

    def test_add_no_git(self, git_ignore):
        git_ignore.base.git_found = False
        git_ignore.add("file.py")

    def test_add_creates_gitignore(self, git_ignore):
        with tempfile.TemporaryDirectory() as tmpdir:
            git_ignore.base.git_found = True
            git_ignore.path = os.path.join(tmpdir, ".gitignore")
            git_ignore.add("build/")
            with open(git_ignore.path) as f:
                content = f.read()
            assert "build/" in content

    def test_exclude(self, git_ignore):
        with tempfile.TemporaryDirectory() as tmpdir:
            git_ignore.base.git_found = True
            git_ignore.path = os.path.join(tmpdir, ".gitignore")
            git_ignore.exclude("secret.txt")
            with open(git_ignore.path) as f:
                content = f.read()
            assert "!secret.txt" in content
