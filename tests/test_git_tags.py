from unittest.mock import MagicMock
from biscuit.git.tag_manager import GitTagManager

def test_git_tags():
    mgr = GitTagManager()
    mgr.create_tag("v1.0.0", "Release 1.0.0")
    assert "v1.0.0" in mgr.list_tags()
