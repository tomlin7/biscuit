# sample extension

import os
import code
import os, sys, subprocess

class Extension:
    def __init__(self, api):
        self.api = api

    def run(self):
        self.resolve_develop_menu()

    def resolve_develop_menu(self):
        self.app = app = self.api.__dict__['_ExtensionsAPI__base']
        events = app.events
        menubar = app.root.menubar
        develop_menu = menubar.add_menu("Develop")
        develop_menu.add_item("Pop system window where this file", self.event_open_folder_where)
        develop_menu.add_item("Python REPL", self.event_repl)
        develop_menu.add_separator()
        develop_menu.add_item("Project Build", self.event_project_build)
        develop_menu.add_item("Project Debug Build", self.event_project_debug_build)
        develop_menu.add_item("Run Main", self.event_run_main)

    def get_text(self):
        return self.app.editorsmanager.active_editor.content.text.get_all_text()

    def get_path(self):
        return self.app.editorsmanager.active_editor.content.text.path
    
    def event_repl(self, *args):
        context = {}
        context.update(**globals())
        context.update({
            "api": self.api,
            "app": self.app,
            "extendsion": self,
            "get_text": self.get_text,
            "get_path": self.get_path
        })
        print(">>> REPL for biscuit <<<")
        print("You can access the variable app, api and extendsion for further")
        code.InteractiveConsole(locals=context).interact()

    def pop_file_window(self, filename):
        if sys.platform == "win32":
            os.startfile(filename)
        else:
            opener = "open" if sys.platform == "darwin" else "xdg-open"
            subprocess.call([opener, filename])

    def event_open_folder_where(self, *args):
        path = self.app.editorsmanager.active_editor.content.text.path
        dirpath = os.path.dirname(path)
        self.pop_file_window(dirpath)

    def event_open_folder_where(self, *args):
        path = self.app.editorsmanager.active_editor.content.text.path
        dirpath = os.path.dirname(path)
        self.pop_file_window(dirpath)

    def resolve_project_build_command(self, debug=False):
        active_directory = self.app.active_directory
        if not debug:
            marcos = "--marco __WITH_BISCUIT"
        else:
            marcos =  "--marco __BUILD_DEBUG __WITH_BISCUIT"
        if not debug:
            return "python monkey.py build_project --src %s %s " % (active_directory, marcos)
        else:
            return "python monkey.py build_project --src %s %s" % (active_directory, marcos)

    def event_project_build(self, *args):
        os.system(self.resolve_project_build_command())

    def event_run_main(self, *args):
        active_directory = self.app.active_directory
        self.event_project_build()
        cmd = os.path.join(active_directory, "dist", "a.out")
        os.system(cmd)

    def event_project_debug_build(self, *args):
        os.system(self.resolve_project_build_command(True))
