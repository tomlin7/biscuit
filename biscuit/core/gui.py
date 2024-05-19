import platform

from tkinterDnD import Tk

from .components import *
from .config import ConfigManager
from .layout import *


class GUIManager(Tk, ConfigManager):
    """GUI part of Biscuit core (Tkinter).
    Initializes the underlying tkinter GUI and sets up the main components.
    - This is the root of the GUI, and all major components are initialized here.
    - DPI scaling is handled here.
    - Also gives quick access to major components of the editor from API.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
    def setup_tk(self) -> None:
        # remove decorations on windows only
        # config for high DPI with winAPI
        if platform.system() == "Windows":
            from ctypes import windll

            # windll.shcore.SetProcessDpiAwareness(1)

            self.overrideredirect(True)
            self.update_idletasks()

            GWL_EXSTYLE=-20
            WS_EX_APPWINDOW=0x00040000
            WS_EX_TOOLWINDOW=0x00000080
            hwnd = windll.user32.GetParent(self.winfo_id())
            style = windll.user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
            style = style & ~WS_EX_TOOLWINDOW
            style = style | WS_EX_APPWINDOW
            windll.user32.SetWindowLongW(hwnd, GWL_EXSTYLE, style)
            
            myappid = 'com.tomlin7.biscuit'
            windll.shell32.SetCurrentProcessExplicitAppUserModelID(myappid)

        # TODO fr i still can't figure this shit out yet
        # window is going too big in low DPI, when I adjust scale for normal size in high DPI
        # window is going too small in high DPI, when I adjust scale for normal size in low DPI
        self.dpi_value = self.winfo_fpixels('1i')
        self.scale = self.dpi_value / 95.90560471976401 
        # self.tk.call('tk', 'scaling', self.scale)

        self.min_width = round(500)
        self.min_height = round(500)

        app_width = round(1150 * self.scale)
        app_height = round(650 * self.scale)
        x = int((self.winfo_screenwidth() - app_width) / 2)
        y = int((self.winfo_screenheight() - app_height) / 2)

        self.geometry(f"{app_width}x{app_height}+{x}+{y}")
    
        self.withdraw()
        self.update_idletasks()
        self.after(10, self.wm_deiconify)

        self.setup_floating_widgets()
        self.setup_root()

        self.protocol("WM_DELETE_WINDOW", self.on_close_app)
        
    def setup_root(self):
        # the very parent of all GUI parts
        self.root = Root(self)
        self.root.pack(fill=tk.BOTH, expand=True)

        # For easy access to major components of the editor from API (also helps intellisense -- a ton)
        self.basepane = self.root.baseframe
        self.menubar = self.root.menubar
        self.statusbar = self.root.statusbar
        
        self.contentpane = self.root.baseframe.contentpane
        self.editorsmanager = self.root.baseframe.contentpane.editorspane
        
        self.sidebar = self.root.baseframe.sidebar
        self.explorer = self.sidebar.explorer
        self.search = self.sidebar.search
        self.outline = self.sidebar.outline
        self.debug = self.sidebar.debug
        self.source_control = self.sidebar.source_control
        self.extensions_GUI = self.sidebar.extensions
        
        self.panel = self.root.baseframe.contentpane.panel
        self.terminalmanager = self.panel.terminals
        self.logger = self.panel.logger
        self.problems = self.panel.problems

    def setup_floating_widgets(self) -> None:
        # separate function because why not

        self.palette = Palette(self)
        self.findreplace = FindReplace(self)
        self.notifications = Notifications(self)

        self.autocomplete = AutoComplete(self)
        self.definitions = Definitions(self)
        self.rename = Rename(self)
        self.pathview = PathView(self)
        self.hover = Hover(self)
    
    def late_setup(self) -> None:
        # for components that are dependant on other components (called after initialization)

        self.binder.late_bind_all()
        self.editorsmanager.add_default_editors()
        self.editorsmanager.generate_actionsets()
        self.settings.late_setup()
        self.history.generate_actionsets()
        self.git.late_setup()
        self.register_misc_palettes()

        # force set focus on this window
        self.focus_set()
        
        if self.testing:
            return

        self.setup_api()
        self.extensions_GUI.initialize()

    def register_misc_palettes(self) -> None:
        self.google_search = ActionSet("Search on google...", "google:", 
                                       pinned=[["Search on Google: {}", search_google],])
        self.palette.register_actionset(lambda:self.google_search)
    
    def set_title(self, title: str=None) -> None:
        if not self.initialized:
            return
        
        self.menubar.set_title(title)
        self.menubar.reposition_title()

    def register_onupdate(self, fn) -> None:
        self.onupdate_callbacks.append(fn)

    def on_gui_update(self, *_) -> None:
        for fn in self.onupdate_callbacks:
            try:
                fn()
            except tk.TclError:
                pass

    def register_onfocus(self, fn) -> None:
        self.onfocus_callbacks.append(fn)
    
    def on_close_app(self) -> None:
        self.editorsmanager.delete_all_editors()
        self.destroy()

    def on_focus(self, *_) -> None:
        for fn in self.onfocus_callbacks:
            try:
                fn()
            except tk.TclError:
                pass

    def resize(self, mode: str) -> None:
        abs_x = self.winfo_pointerx() - self.winfo_rootx()
        abs_y = self.winfo_pointery() - self.winfo_rooty()
        width = self.winfo_width()
        height= self.winfo_height()
        x = self.winfo_rootx()
        y = self.winfo_rooty()

        match mode:
            case 'e':
                if height > self.min_height and abs_x > self.min_width:
                    return self.geometry(f"{abs_x}x{height}")
            case 'n':
                height = height - abs_y
                y = y + abs_y
                if height > self.min_height and width > self.min_width:
                    return self.geometry(f"{width}x{height}+{x}+{y}")
            case 'w':
                width = width - abs_x
                x = x + abs_x
                if height > self.min_height and width > self.min_width:
                    return self.geometry(f"{width}x{height}+{x}+{y}")
            case 's':
                height = height - (height - abs_y)
                if height > self.min_height and width > self.min_width:
                    return self.geometry(f"{width}x{height}+{x}+{y}")
