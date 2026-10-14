from unittest.mock import MagicMock
from biscuit.git.pr import PRViewer

def test_pr_load_comments():
    pr = MagicMock()
    comments = [
        {"user": {"login": "alice"}, "body": "LGTM!"},
        {"user": {"login": "bob"}, "body": "Please add test."}
    ]
    PRViewer.load_comments(pr, comments)
    assert len(pr.comments) == 2
    assert pr.comments[0]["user"]["login"] == "alice"
