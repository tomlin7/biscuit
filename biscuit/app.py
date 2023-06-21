import os, sys, subprocess, tkinter as tk

from core import *
from core.components import FindReplace
from core.components.games import Tetris

# TODO re enable statusbar info

class App(tk.Tk):
    def __init__(self, dir, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # TODO handling resizing, positioning, close min max buttons
        #self.overrideredirect(True)

        self.setup()
        self.root = Root(self)
        self.root.pack(fill=tk.BOTH, expand=True)
        self.late_setup()
        self.initialize_editor()
    
    def run(self):
        self.mainloop()
    
    def setup(self):
        self.setup_tk()
        self.setup_path()
        self.setup_configs()
    
    def late_setup(self):
        self.binder.late_bind_all()
        self.setup_references()
        self.palette.register_actionset(self.settings.actionset)

    def setup_tk(self):
        self.geometry("1100x750")
        self.minsize(800, 600)
        self.title("Biscuit")

    def setup_path(self):       
        self.appdir = os.path.dirname(__file__)
        self.configdir = os.path.join(self.appdir, 'config')
        self.resdir = os.path.join(self.appdir, 'res')
        self.themesdir = os.path.join(self.configdir, 'themes')

    def setup_configs(self):
        self.git_found = False
        self.active_directory = None
        self.active_branch_name = None

        self.git = Git(self)
        self.palette = Palette(self)
        self.findreplace = FindReplace(self)
        self.sysinfo = SysInfo(self)
        self.events = Events(self)
        self.settings = Settings(self)
        self.binder = Binder(self)
        self.style = Style(self)

    def setup_references(self):
        self.editorsmanager = self.root.baseframe.contentpane.editorspane
        self.explorer = self.root.baseframe.sidebar.get_explorer()
        self.source_control = self.root.baseframe.sidebar.get_source_control()
        self.logger = self.root.baseframe.contentpane.panel.get_logger()
    
    def initialize_editor(self):
        self.palette.generate_help_actionset()

        self.logger.info('Biscuit started.')
        self.logger.warning('last biscuit.')
        self.logger.error('No biscuits left.')
    
    def open_directory(self, dir):
        if not os.path.isdir(dir):
            return

        self.active_directory = dir
        self.explorer.directory.change_path(dir)
        self.set_title(os.path.basename(self.active_directory))

        # self.check_git()
        # self.update_git()
    
    def close_active_dir(self):
        self.active_directory = None
        self.active_directory_name = None
        self.explorer.directory.close_directory()

    def open_editor(self, path, exists=True):
        self.editorsmanager.open_editor(path, exists)
    
    # games ----
    def open_tetris(self, *_):
        self.editorsmanager.add_editor(Tetris(self.editorsmanager))

    # ----------
    
    # def update_git(self):
    #     if self.git_found:
    #         self.active_branch_name = self.git.get_active_branch()

    #         self.statusbar.configure_git_info(True)
    #         self.update_statusbar_git_info()

    #         self.source_control_ref.create_root()
    #         self.source_control_ref.update_panes()
    #     else:
    #         self.statusbar.configure_git_info(False)
    #         self.source_control_ref.disable_tree()

    def open_in_new_window(self, dir):
        subprocess.Popen(["python", sys.argv[0], dir])
    
    def open_new_window(self):
        subprocess.Popen(["python", sys.argv[0]])

    def set_title(self, name):
        self.title(f"{name} - Biscuit")
    
    # def update_statusbar_git_info(self):
    #     self.statusbar.set_git_info(self.git.get_active_branch())

    # def update_statusbar_ln_col_info(self):
    #     if self.active_editor:
    #         active_tab = self.editor_groups_ref.groups.get_active_tab()
    #         if active_tab:
    #             if active_tab.content.editable:            
    #                 self.statusbar.configure_editmode(True)
    #                 active_text = active_tab.content.text
    #                 self.statusbar.set_line_col_info(
    #                     active_text.line, active_text.column, active_text.get_selected_count())
    #             else:
    #                 self.statusbar.configure_editmode(False)
    #         else:
    #             self.statusbar.configure_editmode(False)
    #     else:
    #         self.statusbar.configure_editmode(False)
