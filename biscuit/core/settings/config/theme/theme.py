from collections.abc import Mapping


class ThemeObject(Mapping):
    """
    Base theme object. If no colors are passed, uses the parent's color data.

    Parameters:
    parent, background, foreground, highlightbackground, highlightforeground,
    selectedbackground, selectedforeground
    """
    def __init__(self, master, background=None, foreground=None, 
                 highlightbackground=None, highlightforeground=None,
                 selectedbackground=None,  selectedforeground=None, **kwargs):
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
    def to_dict(self):
        return {
            'background': self.background, 'foreground': self.foreground,
            'activebackground': self.highlightbackground,
            'activeforeground': self.highlightforeground
            }

class FrameThemeObject(ThemeObject):
    def to_dict(self):
        return {'background': self.background}


class EditorsPane(FrameThemeObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.bar = FrameThemeObject(self)
        self.bar.tab = HighlightableThemeObject(self.bar)
        self.bar.tab.close = HighlightableThemeObject(self.bar)

class PanelPane(FrameThemeObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.bar = FrameThemeObject(self)
        self.bar.tab = HighlightableThemeObject(self.bar).remove_bg_highlight()


class ContentPane(FrameThemeObject):
    """
    ContentPane 
    ├── EditorsPane
    └── Panel
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.editors = EditorsPane(self)
        self.panel = PanelPane(self)

class SidebarPane(FrameThemeObject):
    def __init__(self, *args, **kwargs):
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
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.content = ContentPane(self)
        self.sidebar = SidebarPane(self)


class Layout(FrameThemeObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.menubar = FrameThemeObject(self)
        self.menubar.item = HighlightableThemeObject(self.menubar)

        self.base = BasePane(self)

        self.statusbar = FrameThemeObject(self)
        self.statusbar.button = HighlightableThemeObject(self.statusbar).remove_bg_highlight()

class SidebarViews(FrameThemeObject):    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.title = ThemeObject(self)
        self.itembar = FrameThemeObject(self)
        self.itembar.title = ThemeObject(self)
        self.item = FrameThemeObject(self)
        self.item.content = ThemeObject(self)
        self.toggle_button = HighlightableThemeObject(self)
    
class PanelViews(FrameThemeObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.button = HighlightableThemeObject(self)
        
        self.logs = ThemeObject(self)
        self.logs.time = "#008000"
        self.logs.caller = "#0000ff"
        self.logs.info = "#098677"
        self.logs.warning = "#a31515"
        self.logs.error = "#ab1515"

        self.terminal = ThemeObject(self)

class Views(FrameThemeObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.panel = PanelViews(self)
        self.sidebar = SidebarViews(self)

class Palette(FrameThemeObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.searchbar = ThemeObject(self)
        self.item = HighlightableThemeObject(self)

class Menu(FrameThemeObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.item = HighlightableThemeObject(self)

class Notifications(FrameThemeObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.button = HighlightableThemeObject(self)
        self.text = ThemeObject(self)

class Editors(FrameThemeObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.biscuit_labels = FrameThemeObject(self) # welcome page
        self.button = HighlightableThemeObject(self)
        self.labels = ThemeObject(self)

        self.text = ThemeObject(self)
        self.minimap = FrameThemeObject(self)

        self.breadcrumbs = FrameThemeObject(self)
        self.breadcrumbs.item = HighlightableThemeObject(self).remove_bg_highlight()

        self.linenumbers = FrameThemeObject(self)
        self.linenumbers.number = ThemeObject(self.linenumbers)
        self.linenumbers.number.foreground = "#6e7681"
        self.linenumbers.number.highlightforeground = "#171184"

class Utils(ThemeObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        theme = self.master

        self.button = HighlightableThemeObject(self, theme.biscuit, "white", theme.biscuit_dark)
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

    def __init__(self):
        primary = [self.primary_background, self.primary_foreground, self.primary_background_highlight, self.primary_foreground_highlight]
        secondary = [self.secondary_background, self.secondary_foreground, self.secondary_background_highlight, self.secondary_foreground_highlight]
        
        self.layout = Layout(self, *primary)
        self.views = Views(self, *primary)
        self.utils = Utils(self, *primary)
        self.menu = Menu(self, *secondary)
        self.editors = Editors(self, *secondary)
        self.palette = Palette(self, *secondary)
        self.notifications = Notifications(self, *secondary)
