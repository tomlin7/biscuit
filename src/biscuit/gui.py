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
            from ctypes import windll

            # TODO: DPI awareness for windows
            # disabled because it messes up the scaling
            # windll.shcore.SetProcessDpiAwareness(1)

            self.overrideredirect(True)
            self.update_idletasks()

            GWL_EXSTYLE = -20
            WS_EX_APPWINDOW = 0x00040000
            WS_EX_TOOLWINDOW = 0x00000080
            hwnd = windll.user32.GetParent(self.winfo_id())
            style = windll.user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
            style = style & ~WS_EX_TOOLWINDOW
            style = style | WS_EX_APPWINDOW
            windll.user32.SetWindowLongW(hwnd, GWL_EXSTYLE, style)

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
        self.outline = self.secondary_sidebar.outline
        self.source_control = self.secondary_sidebar.source_control
        self.debug = self.sidebar.debug
        self.ai = self.secondary_sidebar.ai
        self.github = self.secondary_sidebar.github
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
