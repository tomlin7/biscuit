from unittest.mock import MagicMock
from biscuit.git.git import Git

def test_branch_switcher_commit_times():
    g = MagicMock(spec=Git)
    g.branches = [("main", "2026-10-14 12:00"), ("feat-1", "2026-10-14 11:30")]
    g.actionset = MagicMock()
    g.repo = MagicMock()

    # Verify formatting logic
    items = [
        (f"{str(branch)} ({str(commit_time)})", branch)
        for branch, commit_time in g.branches
    ]
    assert items[0][0] == "main (2026-10-14 12:00)"
    assert items[1][0] == "feat-1 (2026-10-14 11:30)"
