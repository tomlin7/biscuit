from unittest.mock import MagicMock
from biscuit.git.blame import GitBlameController, BlameInfo
from biscuit.editor.text.text import Text

def test_git_blame_annotation():
    info = BlameInfo("John Doe", "2 days ago", "abc1234", "fix: resolve NPE")
    formatted = info.format_annotation()
    assert "John Doe" in formatted
    assert "2 days ago" in formatted
    assert "fix: resolve NPE" in formatted

def test_git_blame_controller_get_blame():
    mock_commit = MagicMock()
    mock_commit.author = "Alice"
    mock_commit.summary = "Initial commit"
    mock_commit.hexsha = "1234567890abcdef"
    mock_commit.authored_datetime.strftime.return_value = "2026-01-01"

    mock_repo = MagicMock()
    mock_repo.blame.return_value = [[mock_commit, ["line1"]]]

    controller = GitBlameController(repo=mock_repo)
    info = controller.get_blame("test.py", 1)

    assert info is not None
    assert info.author == "Alice"
    assert info.commit_hash == "1234567"
    assert info.summary == "Initial commit"
    assert "Alice" in info.format_annotation()

def test_text_git_blame_integration():
    text = MagicMock(spec=Text)
    text.minimalist = False
    text.standalone = False
    text.exists = True
    text.path = "sample.py"
    text.index.return_value = "1.0"
    text._blame_req_id = 0
    text._blame_label = MagicMock()

    text.base = MagicMock()
    text.cget.return_value = "#1e1e1e"
    text._reposition_blame_label = MagicMock()
    ctrl = MagicMock(spec=GitBlameController)
    info = BlameInfo("Bob", "yesterday", "fedcba9", "update")
    ctrl.get_blame.return_value = info
    text.git_blame_controller = ctrl

    Text.update_git_blame(text, 1)
    assert text._blame_req_id == 1

    Text._render_git_blame(text, 1, 1, info)
    assert text._current_blame_line == 1
    assert "Bob" in text._current_blame_text

    Text.clear_git_blame(text)
    assert text._current_blame_line is None
