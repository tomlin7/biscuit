from unittest.mock import MagicMock
from biscuit.editor.text.text import Text

def test_delayed_hover_dismissal():
    t = MagicMock(spec=Text)
    t._hover_hide_timer = "timer_123"
    t.hover = MagicMock()

    Text.cancel_hide_hover(t)
    t.after_cancel.assert_called_with("timer_123")
    assert t._hover_hide_timer is None

    Text._dismiss_hover_if_outside(t)
    t.hover.hide.assert_called_once()
