from biscuit.editor.text.whitespace import WhitespaceRenderer

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
