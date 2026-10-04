from biscuit.debugger.console import DebugConsoleSession


def test_console_eval_expression():
    session = DebugConsoleSession()
    res = session.evaluate("1 + 2 * 3")
    assert res.output == "7"
    assert res.is_error is False


def test_console_eval_scope():
    session = DebugConsoleSession()
    scope = {"user": "Alice", "score": 95}
    res = session.evaluate("f'{user} has score {score}'", scope=scope)
    assert res.output == "'Alice has score 95'"
    assert res.is_error is False


def test_console_eval_error():
    session = DebugConsoleSession()
    res = session.evaluate("1 / 0")
    assert res.is_error is True
    assert "ZeroDivisionError" in res.output
