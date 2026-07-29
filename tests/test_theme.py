import pytest

from biscuit.settings.theme.theme import (
    Theme,
    ThemeObject,
    HighlightableThemeObject,
    FrameThemeObject,
    Layout,
    Editors,
    EditorsPane,
    PanelPane,
    ContentPane,
    DrawerPane,
    Views,
    SidebarViews,
    PanelViews,
    Palette,
    Menu,
    Notifications,
    Utils,
)


@pytest.fixture
def parent():
    p = ThemeObject.__new__(ThemeObject)
    p.background = "#aaa"
    p.foreground = "#bbb"
    p.highlightbackground = "#ccc"
    p.highlightforeground = "#ddd"
    p.selectedbackground = "#eee"
    p.selectedforeground = "#fff"
    return p


class TestThemeObject:
    def test_init_with_all_colors(self):
        t = ThemeObject.__new__(ThemeObject)
        ThemeObject.__init__(t, None, background="#000", foreground="#fff",
                            highlightbackground="#111", highlightforeground="#eee",
                            selectedbackground="#222", selectedforeground="#ddd")
        assert t.background == "#000"
        assert t.foreground == "#fff"
        assert t.highlightbackground == "#111"
        assert t.highlightforeground == "#eee"

    def test_init_fallback_to_parent(self, parent):
        t = ThemeObject.__new__(ThemeObject)
        ThemeObject.__init__(t, parent)
        assert t.background == "#aaa"
        assert t.foreground == "#bbb"

    def test_values(self, parent):
        assert parent.values() == ("#aaa", "#bbb", "#ccc", "#ddd")

    def test_to_dict(self, parent):
        d = parent.to_dict()
        assert d["background"] == "#aaa"
        assert d["foreground"] == "#bbb"

    def test_update(self, parent):
        parent.update(background="#c0c0c0")
        assert parent.background == "#c0c0c0"

    def test_getitem(self, parent):
        assert parent["background"] == "#aaa"

    def test_iter(self, parent):
        keys = list(iter(parent))
        assert "background" in keys
        assert "foreground" in keys

    def test_len(self, parent):
        assert len(parent) == 2

    def test_remove_bg_highlight(self):
        t = ThemeObject.__new__(ThemeObject)
        ThemeObject.__init__(t, None, background="#a", foreground="#b", highlightbackground="#c", highlightforeground="#d")
        result = t.remove_bg_highlight()
        assert t.highlightbackground == "#a"
        assert result is t

    def test_kwargs(self, parent):
        t = ThemeObject.__new__(ThemeObject)
        ThemeObject.__init__(t, parent, background="#a", foreground="#b", extra_attr="extra_value")
        assert t.extra_attr == "extra_value"


class TestHighlightableThemeObject:
    def test_to_dict(self):
        t = HighlightableThemeObject.__new__(HighlightableThemeObject)
        HighlightableThemeObject.__init__(t, None, background="#a", foreground="#b", highlightbackground="#c", highlightforeground="#d")
        d = t.to_dict()
        assert d["activebackground"] == "#c"
        assert d["activeforeground"] == "#d"


class TestFrameThemeObject:
    def test_to_dict(self, parent):
        t = FrameThemeObject.__new__(FrameThemeObject)
        FrameThemeObject.__init__(t, parent, background="#a")
        d = t.to_dict()
        assert d == {"background": "#a"}


class TestTheme:
    @pytest.fixture
    def theme(self):
        return Theme()

    def test_init(self, theme):
        assert theme.name == "default"
        assert theme.biscuit == "#dc8c34"

    def test_has_layout(self, theme):
        assert isinstance(theme.layout, Layout)

    def test_has_views(self, theme):
        assert isinstance(theme.views, Views)

    def test_has_editors(self, theme):
        assert isinstance(theme.editors, Editors)

    def test_has_palette(self, theme):
        assert isinstance(theme.palette, Palette)

    def test_has_menu(self, theme):
        assert isinstance(theme.menu, Menu)

    def test_has_notifications(self, theme):
        assert isinstance(theme.notifications, Notifications)

    def test_has_utils(self, theme):
        assert isinstance(theme.utils, Utils)

    def test_syntax_mapping(self, theme):
        assert len(theme.syntax) > 0

    def test_treesitter_syntax(self, theme):
        assert len(theme.treesitter_syntax) > 0
        assert "keyword" in theme.treesitter_syntax
        assert "function" in theme.treesitter_syntax
        assert "string" in theme.treesitter_syntax

    def test_primary_secondary(self, theme):
        assert len(theme.primary) == 4
        assert len(theme.secondary) == 4

    def test_layout_structure(self, theme):
        assert isinstance(theme.layout.content, ContentPane)
        assert isinstance(theme.layout.content.editors, EditorsPane)
        assert isinstance(theme.layout.content.panel, PanelPane)
        assert isinstance(theme.layout.sidebar, DrawerPane)
        assert isinstance(theme.layout.menubar, FrameThemeObject)
        assert isinstance(theme.layout.statusbar, FrameThemeObject)

    def test_editors_structure(self, theme):
        assert isinstance(theme.editors.text, ThemeObject)
        assert isinstance(theme.editors.minimap, FrameThemeObject)
        assert theme.editors.bracket_colors == ("ffd700", "da70d6", "179fff")

    def test_views_structure(self, theme):
        assert isinstance(theme.views.sidebar, SidebarViews)
        assert isinstance(theme.views.panel, PanelViews)

    def test_utils_structure(self, theme):
        assert isinstance(theme.utils.button, HighlightableThemeObject)
        assert isinstance(theme.utils.tree, FrameThemeObject)
        assert isinstance(theme.utils.scrollbar, HighlightableThemeObject)
