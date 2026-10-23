import pytest
from biscuit.editor.text.ts_highlighter import TREE_SITTER_AVAILABLE, TreeSitterHighlighter


class MockEditorsTheme:
    bracket_colors = ("ffd700", "da70d6", "179fff")
    activebracket = "#333333"


class MockTheme:
    treesitter_syntax = {}
    editors = MockEditorsTheme()


class MockBase:
    theme = MockTheme()


class MockText:
    def __init__(self, content=""):
        self.content = content
        self.tags = {}
        self.tag_configs = {}
        self.base = MockBase()

    def get_all_text(self):
        return self.content

    def tag_configure(self, tag, **kwargs):
        self.tag_configs[tag] = kwargs

    def tag_raise(self, tag, above_this=None):
        pass

    def tag_add(self, tag, start, end):
        self.tags.setdefault(tag, []).append((start, end))

    def tag_remove(self, tag, start, end):
        if tag in self.tags:
            self.tags[tag] = []


@pytest.mark.skipif(not TREE_SITTER_AVAILABLE, reason="tree-sitter not available")
class TestBracketPairColorization:
    def test_bracket_colorization_and_matching(self):
        code = "def foo(a, b):\n    return [1, {2: (3)}]\n"
        text = MockText(code)
        highlighter = TreeSitterHighlighter(text, language="python")
        highlighter.highlight()

        # Check tag configurations for depths
        assert "bracket.depth0" in text.tag_configs
        assert "bracket.depth1" in text.tag_configs
        assert "bracket.depth2" in text.tag_configs

        # Ensure brackets were tagged
        depth0_tags = text.tags.get("bracket.depth0", [])
        assert len(depth0_tags) >= 2  # def foo(a, b) parens and/or outermost brackets

        # Check bracket map for matching coordinates
        # Line 1: def foo(a, b):  -> '(' is at (1, 7), ')' is at (1, 12)
        matching_close = highlighter.get_matching_bracket(1, 7)
        assert matching_close == (1, 12)
        assert highlighter.get_matching_bracket(1, 12) == (1, 7)

        # Line 2: return [1, {2: (3)}]
        # '[' is at (2, 11), ']' is at (2, 23)
        assert highlighter.get_matching_bracket(2, 11) == (2, 23)
        assert highlighter.get_matching_bracket(2, 23) == (2, 11)

    @staticmethod
    def test_refresh_visible_brackets_rebuilds_matching_map():
        """Refreshing viewport brackets rebuilds the matching bracket map."""
        code = "value = (1 + 2)\n"
        text = MockText(code)
        highlighter = TreeSitterHighlighter(text, language="python")
        highlighter.highlight()

        highlighter.refresh_visible_brackets()

        assert highlighter.get_matching_bracket(1, 8) == (1, 14)
        assert highlighter.get_matching_bracket(1, 14) == (1, 8)

    def test_clear_removes_bracket_tags(self):
        code = "x = (1 + 2)\n"
        text = MockText(code)
        highlighter = TreeSitterHighlighter(text, language="python")
        highlighter.highlight()
        assert len(highlighter.bracket_map) > 0

        highlighter.clear()
        assert len(highlighter.bracket_map) == 0
        assert text.tags.get("bracket.depth0") == []
