import os, sys, subprocess, tkinter as tk

from core import *
from core.components import FindReplace, register_game
from core.settings.editor import SettingsEditor


class App(tk.Tk):
    def __init__(self, dir, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.base = self

        # TODO handling resizing, positioning, close min max buttons
        #self.overrideredirect(True)

        self.setup()
        self.root = Root(self)
        self.root.pack(fill=tk.BOTH, expand=True)
        self.late_setup()
        self.initialize_editor()
    
    def run(self):
        self.mainloop()
        self.extensionsmanager.stop_server()
    
    def setup(self):
        self.setup_tk()
        self.setup_path()
        self.setup_configs()
    
    def late_setup(self):
        self.focus_set()
        self.binder.late_bind_all()
        self.setup_references()
        self.editorsmanager.add_default_editors()
        self.palette.register_actionset(lambda: self.settings.actionset)
        self.setup_extensions()
    
    def setup_tk(self):
        self.geometry("1100x750")
        self.minsize(800, 600)
        self.title("Biscuit")

    def setup_path(self):       
        self.appdir = os.path.dirname(__file__)
        self.configdir = os.path.join(self.appdir, 'config')
        self.resdir = os.path.join(self.appdir, 'res')
        self.extensionsdir = os.path.join(self.appdir, "extensions")

    def setup_configs(self):
        self.git_found = False
        self.active_directory = None
        self.active_branch_name = None
        self.onupdate_functions = []

        self.sysinfo = SysInfo(self)
        self.settings = Settings(self)
        
        self.configs = self.settings.config
        self.theme = self.configs.theme
        
        self.events = Events(self)
        self.binder = Binder(self)

        self.git = Git(self)
        self.palette = Palette(self)
        self.findreplace = FindReplace(self)
        self.notifications = Notifications(self)

    def setup_references(self):
        self.editorsmanager = self.root.baseframe.contentpane.editorspane
        self.panel = self.root.baseframe.contentpane.panel
        self.contentpane = self.root.baseframe.contentpane
        self.statusbar = self.root.statusbar
        self.explorer = self.root.baseframe.sidebar.explorer
        self.source_control = self.root.baseframe.sidebar.source_control
        self.logger = self.panel.logger
    
    def setup_extensions(self):
        self.api = ExtensionsAPI(self)
        self.extensionsmanager = ExtensionManager(self)
        self.extensionsmanager.start_server()

    def initialize_editor(self):
        self.palette.generate_help_actionset()
        self.logger.info('Initializing editor finished.')
    
    def open_directory(self, dir):
        if not os.path.isdir(dir):
            return

        self.active_directory = dir
        self.explorer.directory.change_path(dir)
        self.set_title(os.path.basename(self.active_directory))
        self.update_git()
    
    def close_active_directory(self):
        self.active_directory = None
        self.explorer.directory.close_directory()
        self.editorsmanager.delete_all_editors()
        self.set_title()
        self.update_git()
    
    def close_active_editor(self):
        self.editorsmanager.close_active_editor()

    def open_editor(self, path, exists=True):
        if exists and not os.path.isfile(path):
            return

        self.editorsmanager.open_editor(path, exists)

    def open_diff(self, path, exists=True):
        if exists and not os.path.isfile(path):
            return

        self.editorsmanager.open_diff_editor(path, exists)
    
    def open_settings(self):
        self.editorsmanager.add_editor(SettingsEditor(self.editorsmanager))
    
    def open_game(self, name):
        self.editorsmanager.open_game(name)
    
    def register_game(self, game):
        register_game(game)
        self.settings.gen_actionset()
    
    def update_git(self):
        self.git.check_git()
        self.statusbar.update_git_info()
        self.source_control.refresh()

    def open_in_new_window(self, dir):
        subprocess.Popen(["python", sys.argv[0], dir])
    
    def open_new_window(self):
        subprocess.Popen(["python", sys.argv[0]])

    def set_title(self, name=None):
        if name:
            return self.title("Biscuit")
        self.title(f"{name} - Biscuit")
    
    def toggle_terminal(self):
        self.panel.set_active_view(self.panel.terminal)
        self.contentpane.toggle_panel()
    
    def update_statusbar(self):
        if editor := self.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                self.statusbar.toggle_editmode(True)
                active_text = editor.content.text
                return self.statusbar.set_line_col_info(
                    active_text.line, active_text.column, active_text.get_selected_count())

        self.statusbar.toggle_editmode(False)
    
    def register_onupdate(self, fn):
        self.onupdate_functions.append(fn)

    def on_gui_update(self, *_):
        for fn in self.onupdate_functions:
            try:
                fn()
            except tk.TclError:
                pass
