import os
import platform
import subprocess
import sys
import threading
import tkinter as tk
from multiprocessing import Process

from biscuit.core import *
from biscuit.core.components import FindReplace, Git, register_game
from biscuit.core.settings.editor import SettingsEditor


class App(tk.Tk):
    def __init__(self, appdir=None, dir=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.base = self
        self.setup_path(appdir)
        
        self.setup()
        self.late_setup()
        self.initialize_editor()        
      
    def run(self):
        """Runs the main loop of the application and stops the extension manager server."""
        self.mainloop()
        self.extensionsmanager.stop_server()
    
    def setup(self):
        """Sets up the Tkinter window, path, and configurations of the application."""
        self.initialized = False
        self.setup_configs()
        self.setup_tk()
        self.setup_floating_widgets()

        grip_w = tk.Frame(self, bg=self.base.theme.biscuit, cursor='left_side')
        grip_w.bind("<B1-Motion>", lambda e: self.resize('w'))
        grip_w.pack(fill=tk.Y, side=tk.LEFT)

        self.root = Root(self)
        self.root.pack(fill=tk.BOTH, expand=True, side=tk.LEFT)

        grip_e = tk.Frame(self, bg=self.base.theme.biscuit, cursor='right_side')
        grip_e.bind("<B1-Motion>", lambda e: self.resize('e'))
        grip_e.pack(fill=tk.Y, side=tk.LEFT)

    def late_setup(self):
        """Sets up the references, binds, and extensions of the application."""
        self.setup_references()
        self.binder.late_bind_all()
        self.editorsmanager.add_default_editors()
        self.settings.late_setup()

        self.focus_set()
        self.setup_extensions()
    
    def setup_path(self, appdir):       
        """Sets up the application directory, configuration directory, resource directory, and extensions directory."""
        self.appdir = os.path.dirname(appdir)
        sys.path.append(self.appdir)
        
        self.resdir = os.path.join(getattr(sys, "_MEIPASS", os.path.dirname(appdir)), "res")
        self.configdir = os.path.join(self.appdir, "config")
        self.extensionsdir = os.path.join(self.appdir, "extensions")

        try:
            os.makedirs(self.extensionsdir, exist_ok=True)
        except Exception as e:
            print(f"Extensions failed: {e}")

    def setup_configs(self):
        """Sets up the system information, settings, configurations, theme, events, binder, Git, palette, find and replace, and notifications of the application."""
        self.testing = False
        if os.environ.get('ENVIRONMENT') == 'test':
            self.testing = True

        self.git_found = False
        self.active_directory = None
        self.active_branch_name = None
        self.onupdate_functions = []
        self.onfocus_functions = []

        self.sysinfo = SysInfo(self)
        self.settings = Settings(self)
        
        self.configs = self.settings.config
        self.theme = self.configs.theme
        
        self.events = Events(self)
        self.binder = Binder(self)
        self.git = Git(self)
    
    def setup_tk(self):
        """Sets up the Tkinter window size, title, and scaling"""
        
        if platform.system() == "Windows":
            from ctypes import windll
            windll.shcore.SetProcessDpiAwareness(1)

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
            self.withdraw()
            self.after(10, lambda:self.wm_deiconify())

        self.dpi_value = self.winfo_fpixels('1i')
        self.scale = self.dpi_value / 72
        self.tk.call('tk', 'scaling', self.scale)

        self.min_width = round(500 * self.scale)
        self.min_height = round(500 * self.scale)

        app_width = round(1000 * self.scale)
        app_height = round(650 * self.scale)
        x = int((self.winfo_screenwidth() - app_width) / 2)
        y = int((self.winfo_screenheight() - app_height) / 2)

        self.geometry(f"{app_width}x{app_height}+{x}+{y}")

    def setup_floating_widgets(self):
        self.palette = Palette(self)
        self.findreplace = FindReplace(self)
        self.notifications = Notifications(self)

    def setup_references(self):
        """Sets up the editors manager, panel, content pane, status bar, explorer, source control, and logger of the application."""
        self.menubar = self.root.menubar
        self.statusbar = self.root.statusbar
        self.editorsmanager = self.root.baseframe.contentpane.editorspane
        self.panel = self.root.baseframe.contentpane.panel
        self.terminalmanager = self.panel.terminal
        self.contentpane = self.root.baseframe.contentpane
        self.sidebar = self.root.baseframe.sidebar
        self.explorer = self.sidebar.explorer
        self.source_control = self.sidebar.source_control
        self.logger = self.panel.logger

    def setup_extensions(self):
        """Sets up the extensions API and manager of the application."""
        if self.testing:
            return
        
        self.api = ExtensionsAPI(self)
        self.extensionsmanager = ExtensionManager(self)
        self.extensionsmanager.start_server()

    def initialize_editor(self):
        """Generates the help action set and initializes the editor of the application."""
        self.palette.generate_help_actionset()
        self.logger.info('Initializing editor finished.')
        
        self.update_idletasks()
        self.initialized = True

        self.menubar.update()
        self.set_title()
    
    def clone_repo(self, url, dir):
        try:
            def clone():
                repodir = self.git.clone(url, dir)
                self.open_directory(repodir)

            temp = threading.Thread(target=clone)
            temp.daemon = True
            temp.start()

        except Exception as e:
            self.base.logger.error(f"Cloning repository failed: {e}")
            self.base.notifications.error("Cloning repository failed: see logs")
            return

    def open_directory(self, dir):
        """Opens a directory in the explorer and updates the Git status."""
        if not os.path.isdir(dir):
            return

        self.active_directory = dir
        self.explorer.directory.change_path(dir)
        self.set_title(os.path.basename(self.active_directory))

        self.editorsmanager.delete_all_editors()
        self.terminalmanager.delete_all_terminals()
        self.terminalmanager.open_terminal()

        self.git.check_git()
        self.update_git()
    
    def close_active_directory(self):
        """Closes the active directory and all editors associated with it."""
        self.active_directory = None
        self.explorer.directory.close_directory()
        self.editorsmanager.delete_all_editors()
        self.set_title()
        self.git_found = False
        self.update_git()
    
    def close_active_editor(self):
        """Closes the active editor."""
        self.editorsmanager.close_active_editor()

    def open_editor(self, path, exists=True):
        """Opens an editor for a file path."""
        if exists and not os.path.isfile(path):
            return

        self.editorsmanager.open_editor(path, exists)

    def open_diff(self, path, kind):
        """Opens a diff editor for a file path."""
        self.editorsmanager.open_diff_editor(path, kind)
    
    def open_settings(self, *_):
        """Opens the settings editor."""
        self.editorsmanager.add_editor(SettingsEditor(self.editorsmanager))
    
    def open_game(self, name):
        """Opens a game editor."""
        self.editorsmanager.open_game(name)
    
    def register_game(self, game):
        """Registers a game and generates the action set."""
        register_game(game)
        self.settings.gen_actionset()
    
    def update_git(self):
        """Updates the Git status and refreshes the source control."""
        self.statusbar.update_git_info()
        self.source_control.refresh()

    def open_in_new_window(self, dir):
        """Opens a new window for a directory."""
        #Process(target=App(sys.argv[0], dir).run).start()
        self.notifications.show("Feature not available in this version.")
    
    def open_new_window(self):
        """Opens a new window."""
        # Process(target=App(sys.argv[0]).run).start()
        self.notifications.show("Feature not available in this version.")

    def toggle_terminal(self):
        """Toggles the terminal panel."""
        self.panel.set_active_view(self.panel.terminal)
        self.contentpane.toggle_panel()
    
    def update_statusbar(self):
        """Updates the status bar with the line, column, and selection information of the active editor."""
        if editor := self.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                self.statusbar.toggle_editmode(True)
                active_text = editor.content.text
                self.statusbar.set_encoding(active_text.encoding)
                return self.statusbar.set_line_col_info(
                    active_text.line, active_text.column, active_text.get_selected_count())

        self.statusbar.toggle_editmode(False)
    
    def register_onupdate(self, fn):
        """Registers a function to be called on GUI update."""
        self.onupdate_functions.append(fn)

    def on_gui_update(self, *_):
        """Calls all registered functions on GUI update."""
        for fn in self.onupdate_functions:
            try:
                fn()
            except tk.TclError:
                pass
    
    def register_onfocus(self, fn):
        """Registers a function to be called on focus."""
        self.onfocus_functions.append(fn)
        
    def on_focus(self, *_):
        """Calls all registered functions on focus."""
        for fn in self.onfocus_functions:
            try:
                fn()
            except tk.TclError:
                pass
    
    def set_title(self, title=None):
        """Sets the title of the application window."""
        if not self.initialized:
            return
        self.menubar.set_title(title)
        self.menubar.reposition_title()
    
    def resize(self, mode):
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
        
        self.menubar.reposition_title()
