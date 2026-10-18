from biscuit.debugger.threads import StackFrame, ThreadCallStackManager, ThreadInfo


def test_thread_callstack_manager():
    mgr = ThreadCallStackManager()
    f1 = StackFrame(id=1, name="worker_run", file="worker.py", line=42)
    f2 = StackFrame(id=2, name="main", file="app.py", line=10)

    t1 = ThreadInfo(id=101, name="WorkerThread-1", status="paused", frames=[f1])
    t2 = ThreadInfo(id=102, name="MainThread", status="running", frames=[f2])

    mgr.update_threads([t1, t2])
    assert mgr.active_thread_id == 101
    assert mgr.get_active_frames() == [f1]

    # Switch thread
    selected = mgr.select_thread(102)
    assert selected == t2
    assert mgr.active_thread_id == 102
    assert mgr.get_active_frames() == [f2]
