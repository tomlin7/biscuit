import pytest

from biscuit.editor.text.ts_highlighter import TREE_SITTER_AVAILABLE, TreeSitterHighlighter


class MockEditorsTheme:
    """Minimal editor theme used by the highlighter tests."""

    bracket_colors = ("ffd700", "da70d6", "179fff")
    activebracket = "#333333"


class MockTheme:
    """Minimal application theme used by the highlighter tests."""

    treesitter_syntax = {}
    editors = MockEditorsTheme()


class MockBase:
    """Minimal application object exposing a theme."""

    theme = MockTheme()


class MockText:
    """Text widget double that records tags added by the highlighter."""

    def __init__(self, content=""):
        """Store the document content and tag state for the test."""
        self.content = content
        self.tags = {}
        self.tag_configs = {}
        self.raised_tag = None
        self.base = MockBase()

    def get_all_text(self):
        """Return the current document content."""
        return self.content

    def tag_configure(self, tag, **kwargs):
        """Record the configuration applied to a tag."""
        self.tag_configs[tag] = kwargs

    def tag_raise(self, tag, above_this=None):
        """Record the most recently raised tag."""
        self.raised_tag = tag

    def tag_add(self, tag, start, end):
        """Record a tag range."""
        self.tags.setdefault(tag, []).append((start, end))

    def tag_remove(self, tag, start, end):
        """Drop all recorded ranges for a tag."""
        if tag in self.tags:
            self.tags[tag] = []


@pytest.mark.skipif(not TREE_SITTER_AVAILABLE, reason="tree-sitter not available")
def test_incremental_highlight_many_replays_all_edits():
    """A batch of edits is replayed before a single parse."""
    text = MockText("x = 1\n")
    highlighter = TreeSitterHighlighter(text, language="python")
    highlighter.highlight()

    first = {
        "start_byte": 5,
        "old_end_byte": 5,
        "new_end_byte": 9,
        "start_point": (0, 5),
        "old_end_point": (0, 5),
        "new_end_point": (0, 9),
    }
    second = {
        "start_byte": 10,
        "old_end_byte": 10,
        "new_end_byte": 19,
        "start_point": (1, 0),
        "old_end_point": (1, 0),
        "new_end_point": (2, 8),
    }
    text.content = "x = 1 + 2\n\nprint(x)"

    highlighter.incremental_highlight_many([first, second])

    assert highlighter.tree.root_node.end_byte == len(text.content.encode("utf-8"))


@pytest.mark.skipif(not TREE_SITTER_AVAILABLE, reason="tree-sitter not available")
def test_incremental_highlight_many_falls_back_to_full_parse():
    """Malformed queued edits trigger a full reparse instead of leaving a bad tree."""
    text = MockText("x = 1\n")
    highlighter = TreeSitterHighlighter(text, language="python")
    highlighter.highlight()
    text.content = "x = 1 + 2\n"

    highlighter.incremental_highlight_many([{"start_byte": 0}])

    assert highlighter.tree.root_node.end_byte == len(text.content.encode("utf-8"))
