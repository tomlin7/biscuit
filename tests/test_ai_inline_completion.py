from biscuit.common.ai.inline_completion import InlineCompletionState

def test_inline_completion_state():
    state = InlineCompletionState(prefix="", suffix="")
    assert not state.is_active

    state.trigger("def foo():", "\nreturn", " print('hello')")
    assert state.is_active
    assert state.suggestion == " print('hello')"

    accepted = state.accept()
    assert accepted == " print('hello')"
    assert not state.is_active
