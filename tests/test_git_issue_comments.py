from unittest.mock import MagicMock
from biscuit.git.issue import IssueViewer

def test_issue_load_comments():
    issue = MagicMock()
    comments = [
        {"user": {"login": "dev1"}, "body": "Confirmed bug in v1.2"},
    ]
    IssueViewer.load_comments(issue, comments)
    assert len(issue.comments) == 1
    assert issue.comments[0]["body"] == "Confirmed bug in v1.2"
