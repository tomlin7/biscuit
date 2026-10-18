from biscuit.views.terminal.queue import TerminalCommandQueue


def test_command_queue_execution():
    executed = []
    queue = TerminalCommandQueue(executor=lambda cmd: executed.append(cmd))

    queue.put("echo hello")
    queue.put("ls -la")

    assert executed == ["echo hello", "ls -la"]
    assert queue.pending_count == 0


def test_command_queue_buffering():
    executed = []
    queue = TerminalCommandQueue(executor=lambda cmd: executed.append(cmd))
    queue.set_ready(False)

    queue.put("git status")
    queue.put("git log")

    assert len(executed) == 0
    assert queue.pending_count == 2

    queue.set_ready(True)
    assert executed == ["git status", "git log"]
    assert queue.pending_count == 0
