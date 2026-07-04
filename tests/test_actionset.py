import pytest
from biscuit.common.actionset import ActionSet

def test_actionset_initialization():
    called = []
    def callback():
        called.append(True)

    actionset = ActionSet(
        description="Test description",
        prefix="test:",
        items=[["Click me", callback]],
        pinned=[["Search google: {}", lambda x: called.append(x)]]
    )

    assert repr(actionset) == "Test description"
    assert actionset.prefix == "test:"
    assert len(actionset) == 1
    assert actionset[0] == ["Click me", callback]


def test_actionset_update_and_add():
    actionset = ActionSet("Desc", "prefix:")
    assert len(actionset) == 0

    actionset.add_action("First", lambda: None)
    assert len(actionset) == 1
    assert actionset[0][0] == "First"

    actionset.update([("Second", lambda: None), ("Third", lambda: None)])
    assert len(actionset) == 2
    assert actionset[0][0] == "Second"
    assert actionset[1][0] == "Third"


def test_actionset_pinned():
    actionset = ActionSet("Desc", "prefix:")
    actionset.add_pinned_actions("Look up {}", lambda x: None)

    pinned_list = actionset.get_pinned("antigravity")
    assert len(pinned_list) == 1
    assert pinned_list[0][0] == "Look up antigravity"

    # Default formatting parameter if None/empty
    pinned_default = actionset.get_pinned("")
    assert pinned_default[0][0] == "Look up ..."
