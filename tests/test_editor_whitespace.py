from unittest.mock import MagicMock
from biscuit.editor.text.whitespace import WhitespaceRenderer
from biscuit.editor.text.text import Text

def test_whitespace_rendering():
    r = WhitespaceRenderer(mode="all")
    decorations = r.get_whitespace_decorations("  def\tfoo():\n")
    assert len(decorations) == 4
    assert decorations[0][1] == "·"
    assert decorations[1][1] == "·"
    assert decorations[2][1] == "→"
    assert decorations[3][1] == "↵"

    r_none = WhitespaceRenderer(mode="none")
    assert len(r_none.get_whitespace_decorations("   ")) == 0

def test_text_whitespace_methods():
    text = MagicMock(spec=Text)
    text.minimalist = False
    text.whitespace_renderer = WhitespaceRenderer(mode="none")
    text.whitespace_labels = []
    text.whitespace_pool = []

    mode = Text.toggle_whitespace(text)
    assert mode == "all"
    assert text.whitespace_renderer.mode == "all"
    text.update_whitespace.assert_called()

    mode2 = Text.toggle_whitespace(text)
    assert mode2 == "none"
    assert text.whitespace_renderer.mode == "none"

    Text.set_whitespace_mode(text, "selection")
    assert text.whitespace_renderer.mode == "selection"
