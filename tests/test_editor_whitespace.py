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

def test_text_whitespace_update_pool_rebinding_and_width():
    text = MagicMock(spec=Text)
    text.minimalist = False
    text.whitespace_renderer = WhitespaceRenderer(mode="all")
    pooled_lbl = MagicMock()
    text.whitespace_labels = []
    text.whitespace_pool = [pooled_lbl]
    text.cget.return_value = "#1e1e1e"
    text.base = MagicMock()
    text.index.side_effect = lambda arg: {"@0,0": "1.0", "@0,0": "1.0", "end": "2.0"}.get(arg, "1.0")
    text.winfo_height.return_value = 200
    text.get.return_value = "hello"  # line 1 text

    # bbox for 1.end (newline) has large width 500
    text.bbox.side_effect = lambda idx: (100, 20, 500, 16) if idx == "1.end" else None

    Text.update_whitespace(text)
    # The pooled label must be rebound to the new index!
    pooled_lbl.bind.assert_called()
    # And newline width must be constrained to 12 (not 500)
    pooled_lbl.place.assert_called_with(x=100, y=20, width=12, height=16)
