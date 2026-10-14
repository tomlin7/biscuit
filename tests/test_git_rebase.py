from biscuit.git.rebase import GitRebaseController, RebaseTodoItem

def test_git_interactive_rebase():
    ctrl = GitRebaseController()
    commits = [
        RebaseTodoItem("pick", "aaa", "commit 1"),
        RebaseTodoItem("pick", "bbb", "commit 2"),
    ]
    ctrl.set_commits(commits)
    ctrl.squash(1)
    assert ctrl.items[1].action == "squash"

    ctrl.drop(0)
    assert ctrl.items[0].action == "drop"
