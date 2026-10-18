from unittest.mock import MagicMock
from biscuit.git.remote_manager import GitRemoteManager

def test_git_remote_management():
    mgr = GitRemoteManager()
    mgr.add_remote("upstream", "https://github.com/upstream/repo.git")
    assert "upstream" in mgr.list_remotes()
    assert mgr._remotes["upstream"] == "https://github.com/upstream/repo.git"

    mgr.remove_remote("upstream")
    assert "upstream" not in mgr.list_remotes()
