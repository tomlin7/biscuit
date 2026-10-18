from biscuit.git.blame import GitBlameController, BlameInfo

def test_git_blame_annotation():
    info = BlameInfo("John Doe", "2 days ago", "abc1234", "fix: resolve NPE")
    formatted = info.format_annotation()
    assert "John Doe" in formatted
    assert "2 days ago" in formatted
    assert "fix: resolve NPE" in formatted
