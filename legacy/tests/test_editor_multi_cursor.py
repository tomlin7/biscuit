from unittest.mock import MagicMock
from biscuit.editor.text.text import Text

def test_multi_cursor_support():
    # Test multi cursor tracking methods
    t = MagicMock(spec=Text)
    t.cursors = []
    Text.add_cursor(t, "1.5")
    Text.add_cursor(t, "2.10")
    assert len(t.cursors) == 2
    assert "1.5" in t.cursors
    assert "2.10" in t.cursors

    Text.clear_cursors(t)
    assert len(t.cursors) == 0
