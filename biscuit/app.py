import os
import subprocess
import sys
from datetime import datetime

from core import Binder, Events, Root, Settings, Style, SysInfo
from core.components.views.source_control import Git


class App:
    def __init__(self, dir, *args, **kwargs):
        self.root = Root(self)

        self.setup_path()
        self.setup_configs()
        self.setup_version_control()

        self.active_directory = None
        self.active_editor = None
    
    def setup_configs(self):
        self.sysinfo = SysInfo(self)
        self.settings = Settings(self)
        self.events = Events(self)
        self.binder = Binder(self)

        self.bindings = self.settings.bindings
        self.style = Style(self.root)

    def setup_version_control(self):
        self.git = Git(self)

        self.git_found = False
        self.active_branch_name = None

    def setup_path(self):       
        self.appdir = os.path.dirname(__file__)
        self.configdir = os.path.join(self.appdir, 'config')
        self.themesdir = os.path.join(self.configdir, 'themes')
        self.bindingsdir = os.path.join(self.configdir, 'bindings')

    def after_initialization(self):
        self.explorer_ref = self.root.primarypane.basepane.explorer
        self.editor_groups_ref = self.root.primarypane.basepane.right.top.editor_groups
        self.source_control_ref = self.root.primarypane.basepane.source_control
        self.trace("Welcome to Biscuit.")
        
        self.refresh()
    
    def check_git(self):
        self.git.open_repo()

    def close_active_dir(self):
        self.active_directory = None
        self.active_directory_name = None
        self.refresh()
        self.explorer_ref.close_directory()
    
    def close_editor(self, path):
        self.editor_groups_ref.groups.remove_tab(path)
        self.refresh()
    
    def close_all_editors(self):
        self.active_editor = None

    def close_active_editor(self):
        if self.active_editor:
            self.close_editor(self.active_editor)
            self.editor_groups_ref.groups.remove_tab(self.active_editor)
            self.refresh()

    def get_active_tab(self):
        return self.editor_groups_ref.groups.get_active_tab()
    
    def open_editor(self, name, path, exists, diff):
        self.editor_groups_ref.groups.add_editor(name, path, exists, diff)

    def open_welcome_tab(self, _):
        self.set_active_file("@welcomepage", exists=False)
    
    def open_in_new_window(self, dir):
        subprocess.Popen(["python", sys.argv[0], dir])
    
    def open_new_window(self):
        subprocess.Popen(["python", sys.argv[0]])

    def refresh(self):
        self.update_statusbar_ln_col_info()
        self.update_editor_tabs_pane()
    
    def refresh_dir(self):
        self.explorer_ref.open_directory(self.active_directory)
        self.update_dir_tree_pane()

    def set_git_found(self, found):
        self.git_found = found

    def set_active_file(self, path, exists=True, diff=False):
        self.active_editor = path
        self.active_file_name = os.path.basename(path)

        self.open_editor(self.active_file_name, self.active_editor, exists, diff)
        # self.refresh()

    def set_active_dir(self, dir):
        if not os.path.isdir(dir):
            return

        self.active_directory = dir
        self.active_directory_name = os.path.basename(dir)

        self.check_git()
        self.update_git()
        
        self.refresh_dir()
        self.close_all_editors()
        self.refresh()

    def trace(self, e):
        time = datetime.now().strftime('• %H:%M:%S •')
        print(f'TRACE {time} {e}')
    
    def toggle_terminal(self, *args):
        self.root.primarypane.basepane.right.terminal.toggle()
    
    def toggle_active_side_pane(self, *args):
        self.root.primarypane.sidebar.toggle_active_pane()
    
    def update_editor_tabs_pane(self):
        self.editor_groups_ref.update_panes()
    
    def update_dir_tree_pane(self):
        self.explorer_ref.update_panes()
    
    def update_git(self):
        if self.git_found:
            self.active_branch_name = self.git.get_active_branch()

            self.root.statusbar.configure_git_info(True)
            self.update_statusbar_git_info()

            self.source_control_ref.create_root()
            self.source_control_ref.update_panes()
        else:
            self.root.statusbar.configure_git_info(False)
            self.source_control_ref.disable_tree()

    def update_statusbar_git_info(self):
        self.root.statusbar.set_git_info(self.git.get_active_branch())

    def update_statusbar_ln_col_info(self):
        if self.active_editor:
            active_tab = self.editor_groups_ref.groups.get_active_tab()
            if active_tab:
                if active_tab.content.editable:            
                    self.root.statusbar.configure_editmode(True)
                    active_text = active_tab.content.text
                    self.root.statusbar.set_line_col_info(
                        active_text.line, active_text.column, active_text.get_selected_count())
                else:
                    self.root.statusbar.configure_editmode(False)
            else:
                self.root.statusbar.configure_editmode(False)
        else:
            self.root.statusbar.configure_editmode(False)
    