import platform
import sqlite3

from tkinterDnD import Tk

from .common import *
from .config import ConfigManager
from .editor import *
from .extensions import *
from .layout import *


class GUIManager(Tk, ConfigManager):
    """GUI manager of Biscuit core (Tkinter)
    -------------------------------------

    Initializes the underlying tkinter GUI and sets up the main components.
    - This is the root of the GUI, and all major components are initialized here.
    - DPI scaling is handled here.
    - Also gives quick access to major components of the editor from API.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def initialize_tk(self) -> None:
        """Initialize and configure tkinter
        Handles DPI scaling and window decorations."""

        # remove decorations on windows only
        # config for high DPI with winAPI
        if platform.system() == "Windows":
            from ctypes import windll, c_void_p, c_int, c_long, byref, sizeof

            # DPI awareness
            try:
                windll.shcore.SetProcessDpiAwareness(1)
            except:
                pass

            # Window styles
            GWL_STYLE = -16
            GWL_EXSTYLE = -20
            WS_CAPTION = 0x00C00000
            WS_THICKFRAME = 0x00040000
            WS_MINIMIZEBOX = 0x00020000
            WS_MAXIMIZEBOX = 0x00010000
            WS_SYSMENU = 0x00080000
            WS_EX_APPWINDOW = 0x00040000

            WS_CLIPCHILDREN = 0x02000000
            WS_CLIPSIBLINGS = 0x04000000

            # Get HWND
            self.update_idletasks()
            hwnd = windll.user32.GetParent(self.winfo_id())

            # Remove title bar (CAPTION) but keep resizing (THICKFRAME) and shadows
            style = windll.user32.GetWindowLongPtrW(hwnd, GWL_STYLE)
            style &= ~WS_CAPTION
            style |= WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU | WS_CLIPCHILDREN | WS_CLIPSIBLINGS
            windll.user32.SetWindowLongPtrW(hwnd, GWL_STYLE, style)

            # Ensure taskbar icon
            ex_style = windll.user32.GetWindowLongPtrW(hwnd, GWL_EXSTYLE)
            ex_style |= WS_EX_APPWINDOW
            windll.user32.SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex_style)

            # Set dark mode for title bar (fixes white line/border)
            try:
                DWMWA_USE_IMMERSIVE_DARK_MODE = 20
                DWMWA_CAPTION_COLOR = 35
                DWMWA_BORDER_COLOR = 34
                
                dark_mode = c_int(1)
                color = c_int(0x000000) # Black
                
                windll.dwmapi.DwmSetWindowAttribute(hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE, byref(dark_mode), sizeof(dark_mode))
                windll.dwmapi.DwmSetWindowAttribute(hwnd, DWMWA_CAPTION_COLOR, byref(color), sizeof(color))
                windll.dwmapi.DwmSetWindowAttribute(hwnd, DWMWA_BORDER_COLOR, byref(color), sizeof(color))
            except:
                pass

            # Redraw window
            windll.user32.SetWindowPos(hwnd, 0, 0, 0, 0, 0, 0x0027) # SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER

            myappid = "com.tomlin7.biscuit"
            windll.shell32.SetCurrentProcessExplicitAppUserModelID(myappid)

        # Works in linux, but currently causing problems in windows
        # due to `shcore.SetProcessDpiAwareness(1)` so currently disabled
        self.dpi_value = self.winfo_fpixels("1i")
        self.scale = self.dpi_value / 95.90560471976401
        # self.tk.call('tk', 'scaling', self.scale)

        # window size and position
        self.min_width = round(500)
        self.min_height = round(500)
        app_width = round(1280 * self.scale)
        app_height = round(720 * self.scale)
        x = int((self.winfo_screenwidth() - app_width) / 2)
        y = int((self.winfo_screenheight() - app_height) / 2)
        self.geometry(f"{app_width}x{app_height}+{x}+{y}")
        self.configure(bg=self.theme.border, highlightthickness=0)

        # very bad hack to fix the window size on windows
        self.withdraw()
        self.update_idletasks()
        self.after(10, self.wm_deiconify)

        self.setup_floating_widgets()
        self.initialize_layout()

        self.protocol("WM_DELETE_WINDOW", self.on_close_app)

    def initialize_layout(self):
        """Initialize the layout of the GUI.

        - Initializes the root of the GUI.
        - Saves references to major components for easy access."""

        # the very parent of all GUI parts
        self.root = Root(self)
        self.editortypes = EditorTypes(self)

        # major components of layout
        self.menubar = self.root.menubar
        self.statusbar = self.root.statusbar

        self.sidebar = self.root.sidebar
        self.secondary_sidebar = self.root.secondary_sidebar
        self.contentpane = self.root.content

        self.panel = self.contentpane.panel
        self.editorsmanager = self.root.content.editorspane
        self.editorsbar = self.editorsmanager.editorsbar
        self.breadcrumbs = self.editorsbar.breadcrumbs

        self.explorer = self.sidebar.explorer
        self.search = self.sidebar.search
        self.outline = self.sidebar.outline
        self.source_control = self.sidebar.source_control
        self.debug = self.secondary_sidebar.debug
        self.ai = self.secondary_sidebar.ai
        self.extensions_view = self.secondary_sidebar.extensions

        self.terminalmanager = self.panel.terminals
        self.logger = self.panel.logger
        self.problems = self.panel.problems

    def setup_floating_widgets(self) -> None:
        """Setup floating widgets that are not part of the main layout."""

        # separate function because why not

        self.palette = Palette(self)
        self.findreplace = FindReplace(self)
        self.notifications = Notifications(self)
        self.extension_viewer = ExtensionViewer(self)

        self.text_editor_context_menu = TextEditorContextMenu(self)

        self.open_editors = OpenEditors(self)
        self.autocomplete = AutoComplete(self)
        self.peek = Peek(self)
        self.rename = Rename(self)
        self.pathview = PathView(self)
        self.hover = Hover(self)
        self.diagnostic = Diagnostic(self)

    def late_setup(self) -> None:
        """Late setup for GUI components that are dependant on other components.
        Called after initialization of major components."""

        self.binder.late_bind_all()
        self.editorsmanager.add_default_editors()
        self.editorsmanager.generate_actionsets()
        self.settings.late_setup()
        self.history.generate_actionsets()
        self.git.late_setup()
        self.debugger_manager.register_actionsets()
        self.register_misc_palettes()

        # force set focus on this window
        self.focus_set()

        if self.testing:
            return

        self.setup_extensions()

    def register_misc_palettes(self) -> None:
        """Register miscellaneous palettes that don't belong to any specific component."""

        self.google_search = ActionSet(
            "Search on google...",
            "google:",
            pinned=[
                ["Search on Google: {}", search_google],
            ],
        )
        self.palette.register_actionset(lambda: self.google_search)

    def set_title(self, title: str = None) -> None:
        """Set the title of the application window.

        Args:
            title (str, optional): Title of the window. Defaults to None."""

        if not self.initialized:
            return

        self.menubar.set_title(title)
        self.menubar.reposition_title()

    def _get_opened_files(self) -> list:
        """
        Get the file paths of all opened files from the active editors.

        Returns:
            list: A list of file paths corresponding to the opened files.
        """

        opened_files = []

        for editor in self.editorsmanager.active_editors:
            if editor.path:
                opened_files.append(editor.path)

        return opened_files

    def on_close_app(self) -> None:

        opened_files = self._get_opened_files()
        self.sessions.clear_session()
        self.sessions.save_session(opened_files, self.active_directory)

        self.history.dump()

        self.editorsmanager.delete_all_editors()
        self.destroy()

    def resize(self, mode: str) -> None:
        """Resize the window based on the mode.

        Args:
            mode (str): Mode of resizing"""

        abs_x = self.winfo_pointerx() - self.winfo_rootx()
        abs_y = self.winfo_pointery() - self.winfo_rooty()
        width = self.winfo_width()
        height = self.winfo_height()
        x = self.winfo_rootx()
        y = self.winfo_rooty()

        match mode:
            case "e":
                if height > self.min_height and abs_x > self.min_width:
                    return self.geometry(f"{abs_x}x{height}")
            case "n":
                height = height - abs_y
                y = y + abs_y
                if height > self.min_height and width > self.min_width:
                    return self.geometry(f"{width}x{height}+{x}+{y}")
            case "w":
                width = width - abs_x
                x = x + abs_x
                if height > self.min_height and width > self.min_width:
                    return self.geometry(f"{width}x{height}+{x}+{y}")
            case "s":
                height = height - (height - abs_y)
                if height > self.min_height and width > self.min_width:
                    return self.geometry(f"{width}x{height}+{x}+{y}")
