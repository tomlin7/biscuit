from collections.abc import Mapping

from pygments.token import Token


class ThemeObject(Mapping):
    """
    Base theme object. If no colors are passed, uses the parent's color data.

    Parameters:
    parent, background, foreground, highlightbackground, highlightforeground,
    selectedbackground, selectedforeground
    """
    def __init__(self, master, background: str=None, foreground: str=None, 
                 highlightbackground: str=None, highlightforeground: str=None,
                 selectedbackground: str=None,  selectedforeground: str=None, **kwargs) -> None:
        self.master = master
        self.background = background or master.background
        self.foreground = foreground or master.foreground
        self.highlightbackground = highlightbackground or master.highlightbackground
        self.highlightforeground = highlightforeground or master.highlightforeground
        self.selectedbackground = selectedbackground or highlightbackground or master.selectedbackground
        self.selectedforeground = selectedforeground or highlightforeground or master.selectedforeground

        for key, value in kwargs.items():
            setattr(self, key, value)

    def values(self):
        return self.background, self.foreground, self.highlightbackground, self.highlightforeground

    def to_dict(self):
        return {
            'background': self.background, 'foreground': self.foreground,
            }

    def __getitem__(self, key):
        return self.to_dict()[key]

    def __iter__(self):
        return iter(self.to_dict())

    def __len__(self):
        return len(self.to_dict())

    def remove_bg_highlight(self):
        self.highlightbackground = self.background
        return self

    # TODO update child theme objects if parent's color values are altered after initialization
    # NOTE experimental code for updating child themeobjects
    # def update_child_colors(self, color_name, color_value):
    #     for attr_name in dir(self):
    #         attr = getattr(self, attr_name)
    #         if isinstance(attr, ThemeObject):
    #             setattr(attr, color_name, color_value)

    # def __setattr__(self, name, value):
    #     super().__setattr__(name, value)
    #     self.update_child_colors(name, value)

    # def __getattr__(self, name):
    #     return self.to_dict().get(name)


class HighlightableThemeObject(ThemeObject):
    def to_dict(self) -> dict:
        return {
            'background': self.background, 'foreground': self.foreground,
            'activebackground': self.highlightbackground,
            'activeforeground': self.highlightforeground
            }

class FrameThemeObject(ThemeObject):
    def to_dict(self) -> dict:
        return {'background': self.background}


class EditorsPane(FrameThemeObject):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.bar = FrameThemeObject(self)
        self.bar.tab = HighlightableThemeObject(self.bar)
        self.bar.tab.icon = ThemeObject(self.bar.tab)
        self.bar.tab.close = HighlightableThemeObject(self.bar)

class PanelPane(FrameThemeObject):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.bar = FrameThemeObject(self)
        self.bar.tab = HighlightableThemeObject(self.bar).remove_bg_highlight()


class ContentPane(FrameThemeObject):
    """
    ContentPane 
    ├── EditorsPane
    └── Panel
    """
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.editors = EditorsPane(self)
        self.panel = PanelPane(self)

class SidebarPane(FrameThemeObject):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.slots = FrameThemeObject(self)
        self.slots.slot = HighlightableThemeObject(self.slots).remove_bg_highlight()
        self.slots.bubble = ThemeObject(self.slots)


class BasePane(FrameThemeObject):
    """
    Base
     ├── Sidebar
     └── ContentPane 
    """
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.content = ContentPane(self)
        self.sidebar = SidebarPane(self)


class Layout(FrameThemeObject):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.menubar = FrameThemeObject(self)
        self.menubar.item = HighlightableThemeObject(self.menubar)
        self.menubar.title = ThemeObject(self)

        self.base = BasePane(self)

        self.statusbar = FrameThemeObject(self)
        self.statusbar.button = HighlightableThemeObject(self.statusbar)

class SidebarViews(FrameThemeObject):    
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)

        self.title = ThemeObject(self)
        self.itembar = FrameThemeObject(self)
        self.itembar.title = ThemeObject(self)
        self.item = FrameThemeObject(self)
        self.item.content = ThemeObject(self)
        self.item.button = HighlightableThemeObject(self)
        self.toggle_button = HighlightableThemeObject(self)

class PanelViews(FrameThemeObject):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.button = HighlightableThemeObject(self)

        self.logs = ThemeObject(self)
        self.logs.time = "#008000"
        self.logs.caller = "#0000ff"
        self.logs.info = "#098677"
        self.logs.warning = "#a31515"
        self.logs.error = "#ab1515"

        self.terminal = FrameThemeObject(self)
        self.terminal.content = ThemeObject(self)
        self.terminal.tab = HighlightableThemeObject(self)

class Views(FrameThemeObject):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.panel = PanelViews(self)
        self.sidebar = SidebarViews(self)

class Palette(FrameThemeObject):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.searchbar = ThemeObject(self)
        self.item = HighlightableThemeObject(self)

class Menu(FrameThemeObject):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.item = HighlightableThemeObject(self)

class Notifications(FrameThemeObject):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.title = ThemeObject(self)
        self.button = HighlightableThemeObject(self)
        self.text = ThemeObject(self)

class Editors(FrameThemeObject):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        theme = self.master

        self.biscuit_labels = FrameThemeObject(self) # welcome page
        self.button = HighlightableThemeObject(self)
        self.section = HighlightableThemeObject(self) # settings
        self.labels = ThemeObject(self)

        self.bracket_colors = ('ffd700', 'da70d6', '179fff')
        self.activebracket = "yellow"

        self.hyperlink = "#4583b6"

        self.selection = "#264f78"
        self.currentline = theme.border
        self.currentword = "#d5d5d5"
        self.found = "#dbe6c2"
        self.foundcurrent = "green"
        self.hovertag = "#d5d5d5"

        self.text = ThemeObject(self)
        self.minimap = FrameThemeObject(self)

        self.breadcrumbs = FrameThemeObject(self)
        self.breadcrumbs.item = HighlightableThemeObject(self).remove_bg_highlight()

        self.linenumbers = FrameThemeObject(self)
        self.linenumbers.number = ThemeObject(self.linenumbers)
        self.linenumbers.number.foreground = "#6e7681"
        self.linenumbers.number.highlightforeground = "#171184"

        self.autocomplete = FrameThemeObject(self)
        self.autocomplete.item = ThemeObject(self.autocomplete)

        self.definitions = FrameThemeObject(self)
        self.definitions.item = HighlightableThemeObject(self.definitions)

        self.hover = FrameThemeObject(self)
        self.hover.text = ThemeObject(self.hover)

        self.diff = FrameThemeObject(self)
        self.diff.not_exist = "#d3d3d3"
        self.diff.removed = "#ffa3a3"
        self.diff.addition = "#dbe6c2"

class Utils(ThemeObject):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        theme = self.master

        self.button = HighlightableThemeObject(self, theme.biscuit, "white", theme.biscuit_dark)
        self.linklabel = ThemeObject(self, theme.secondary_background, theme.biscuit, self.highlightbackground)
        self.colorlabel = ThemeObject(self, theme.biscuit, "white", theme.biscuit_dark)
        self.tree = FrameThemeObject(self)
        self.tree.item = ThemeObject(self.tree)
        self.bubble = ThemeObject(self)
        self.iconbutton = HighlightableThemeObject(self)
        self.iconlabelbutton = HighlightableThemeObject(self, theme.secondary_background, theme.secondary_foreground, self.highlightbackground)
        self.entry = ThemeObject(self, theme.secondary_background, theme.secondary_foreground, self.highlightbackground)
        self.buttonsentry = ThemeObject(self, theme.secondary_background, theme.secondary_foreground, self.highlightbackground)
        self.buttonsentry.button = HighlightableThemeObject(self.buttonsentry)
        self.bubble = ThemeObject(self)
        self.scrollbar = HighlightableThemeObject(self)

class Theme:
    """
    Following are the attributes available:
    layout, views, editors, palette, menu, notifications, utils
    """
    name = "default"

    biscuit = "#dc8c34"
    biscuit_light = "#ecb464"
    biscuit_dark = "#B56711"

    border = "#dfdfdf"

    primary_background = "#f8f8f8"
    primary_foreground = "#424242"
    primary_background_highlight = "#e1e1e1"
    primary_foreground_highlight = 'black'

    secondary_background = 'white'
    secondary_foreground = 'black'
    secondary_background_highlight = 'white'
    secondary_foreground_highlight = 'black'

    # syntax
    Keyword = "#0000ff"
    Name = "#267f99"
    Function = "#795e26"
    String = "#b11515"
    Number = "#098658"
    Comment = "#098658"
    Punctuation = "#3b3b3b"


    def __init__(self) -> None:
        primary = [self.primary_background, self.primary_foreground, self.primary_background_highlight, self.primary_foreground_highlight]
        secondary = [self.secondary_background, self.secondary_foreground, self.secondary_background_highlight, self.secondary_foreground_highlight]

        self.layout = Layout(self, *primary)
        self.views = Views(self, *primary)
        self.utils = Utils(self, *primary)
        self.menu = Menu(self, *secondary)
        self.editors = Editors(self, *secondary)
        self.palette = Palette(self, *secondary)
        self.findreplace = FrameThemeObject(self, *primary)
        self.findreplace.label = ThemeObject(self.findreplace)
        self.notifications = Notifications(self, *secondary)

        self.syntax = {
            Token.Keyword: self.Keyword,
            Token.Keyword.Constant: self.Keyword,
            Token.Keyword.Declaration: self.Keyword,
            Token.Keyword.Namespace: self.Keyword,
            Token.Keyword.Pseudo: self.Keyword,
            Token.Keyword.Reserved: self.Keyword,
            Token.Keyword.Type: self.Keyword,

            Token.Name: self.Name,
            Token.Name.Attribute: self.Name,
            Token.Name.Builtin: self.Name,
            Token.Name.Builtin.Pseudo: self.Name,
            Token.Name.Class: self.Name,
            Token.Name.Constant: self.Name,
            Token.Name.Decorator: self.Name,
            Token.Name.Entity: self.Name,
            Token.Name.Exception: self.Name,
            Token.Name.Function: self. Function,
            Token.Name.Function.Magic: self.Function,
            Token.Name.Property: self.Name,
            Token.Name.Label: self.Name,
            Token.Name.Namespace: self.Name,
            Token.Name.Other: self.Name,
            Token.Name.Tag: self.Name,
            Token.Name.Variable: self.Name,
            Token.Name.Variable.Class: self.Name,
            Token.Name.Variable.Global: self.Name,
            Token.Name.Variable.Instance: self.Name,
            Token.Name.Variable.Magic: self.Name,

            Token.String: self.String,
            Token.String.Affix: self.String,
            Token.String.Backtick: self.String,
            Token.String.Char: self.String,
            Token.String.Delimiter: self.String,
            Token.String.Doc: self.String,
            Token.String.Double: self.String,
            Token.String.Escape: self.String,
            Token.String.Heredoc: self.String,
            Token.String.Interpol: self.String,
            Token.String.Other: self.String,
            Token.String.Regex: self.String,
            Token.String.Single: self.String,
            Token.String.Symbol: self.String,

            Token.Number: self.Number,
            Token.Number.Bin: self.Number,
            Token.Number.Float: self.Number,
            Token.Number.Hex: self.Number,
            Token.Number.Integer: self.Number,
            Token.Number.Integer.Long: self.Number,
            Token.Number.Oct: self.Number,

            Token.Comment: self.Comment,
            Token.Comment.Hashbang: self.Comment,
            Token.Comment.Multiline: self.Comment,
            Token.Comment.Preproc: self.Comment,
            Token.Comment.PreprocFile: self.Comment,
            Token.Comment.Single: self.Comment,
            Token.Comment.Special: self.Comment,

            # Operator: "#"
            # Operator.Word: "#"

            Token.Punctuation: self.Punctuation,
            Token.Punctuation.Marker: self.Punctuation,
        }
