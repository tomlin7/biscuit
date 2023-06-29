class ThemeObject:
    """
    Base theme object

    Parameters:
    background, foreground, highlightbackground, highlightforeground,
    selectedhighlightbackground, selectedhighlightforeground
    """
    def __init__(self, 
                 background=None, 
                 foreground=None, 
                 
                 highlightbackground=None, 
                 highlightforeground=None,

                 selectedhighlightbackground=None, 
                 selectedhighlightforeground=None,
                 
                 **kwargs):
        self.background = background
        self.foreground = foreground
        self.highlightbackground = highlightbackground or background
        self.highlightforeground = highlightforeground or foreground
        self.selectedhighlightbackground = selectedhighlightbackground or highlightbackground
        self.selectedhighlightforeground = selectedhighlightforeground or highlightforeground

        for key, value in kwargs.items():
            setattr(self, key, value)

    def __str__(self):
        return self.background
        
    def __contains__(self, attr):
        return hasattr(self, attr)


class Editors(ThemeObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.bar = ThemeObject(self.background)
        self.tab = ThemeObject(self.bar.background, 'black', 'white')
        self.tab.close = ThemeObject(self.bar.background, "#424242", self.bar.background, 'black')
        self.button = ThemeObject(self.background, '#424242', '#e1e1e1')

class Panel(ThemeObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.bar = ThemeObject(self.background)
        self.tab = ThemeObject(self.bar.background, 'black', 'white')
        self.tab.close = ThemeObject(self.bar.background, "#424242", self.bar.background, 'black')
        self.button = ThemeObject(self.background, '#424242', '#e1e1e1')


class Content(ThemeObject):
    """
    ContentPane 
    ├── EditorsPane
    └── Panel
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.editors = Editors(self.background)
        self.panel = Panel(self.background)

class Sidebar(ThemeObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.slots = ThemeObject(self.background)
        self.slots.slot = ThemeObject(self.slots.background, "#626262", self.slots.background, 'black')
        self.slots.bubble = ThemeObject(self.slots.background, 'black', border='#dddbdd')


class Menubar(ThemeObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.item = ThemeObject(self.background, 'black', "#e4e4e4")

class Base(ThemeObject):
    """
    Base
     ├── Sidebar
     └── ContentPane 
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.content = Content(self.background)
        self.sidebar = Sidebar(self.background)

class Statusbar(ThemeObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.button = ThemeObject(self.background, "#424242", self.background, 'black')
        self.toggle_button = ThemeObject("#dc8c34", 'white', "#ecb464")


class Layout(ThemeObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.menubar = Menubar(self.background)
        self.base = Base(self.background)
        self.statusbar = Statusbar(self.background)
    
class Views(ThemeObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.panel = ThemeObject(self.background, self.foreground)
        self.panel.button = ThemeObject(self.background, self.panel.foreground, "#e1e1e1")

        self.panel.logs = ThemeObject(self.background, self.panel.foreground)
        self.panel.logs.time = "#008000"
        self.panel.logs.caller = "#0000ff"
        self.panel.logs.info = "#098677"
        self.panel.logs.warning = "#a31515"
        self.panel.logs.error = "#ab1515"

        self.panel.terminal = ThemeObject(self.background, self.panel.foreground)

        self.sidebar = ThemeObject(self.background, self.foreground)
        self.sidebar.itembar = ThemeObject(self.sidebar.background, self.sidebar.foreground)
        self.sidebar.item = ThemeObject(self.sidebar.background, self.sidebar.foreground)
        self.sidebar.toggle_button = ThemeObject(self.sidebar.background, self.sidebar.foreground, '#e1e1e1')

class Palette(ThemeObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.searchbar = ThemeObject('white', "#424242", border="#ecb464")
        self.item = ThemeObject('white', "#424242", "#e8e8e8", border="#ecb464")

class Theme:
    """
    Following are the attributes available.

    Layout
    ├── Menubar
    ├── Base
    └── StatusBar

    Views
    ├── Sidebar views
    └── Panel views

    Editors
    Palette

    """
    def __init__(self, theme_name="default"):
        self.theme_name = theme_name

        self.layout = Layout("#dfdfdf")
        self.views = Views("#f8f8f8", "#424242")

        self.editors = ThemeObject("white")
        self.editors.button = ThemeObject("#dfdfdf", "#424242", "#e1e1e1")

        self.palette = Palette("#dfdfdf", "#424242")
        self.notifications = ThemeObject("#dfdfdf", "#424242")

        self.utils = ThemeObject()
        self.utils.button = ThemeObject("#dc8c34", "white", "#ecb464")
