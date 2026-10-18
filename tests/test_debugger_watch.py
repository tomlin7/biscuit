from biscuit.views.debug.watch import WatchManager


def test_watch_manager_add_and_remove():
    mgr = WatchManager()
    mgr.add_expression("len(items)")
    mgr.add_expression("x + y")

    assert mgr.expressions == ["len(items)", "x + y"]

    mgr.remove_expression("x + y")
    assert mgr.expressions == ["len(items)"]


def test_watch_manager_evaluate_all():
    mgr = WatchManager()
    mgr.add_expression("x * 2")
    mgr.add_expression("undefined_var")

    results = mgr.evaluate_all({"x": 21})
    assert results["x * 2"] == "42"
    assert "<error:" in results["undefined_var"]
