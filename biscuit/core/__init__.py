from .config import *
from .events import *
from .gui import *


class App(EventManager, GUIManager, ConfigManager):
    """
    BISCUIT CORE
    ------------

    Manages App Configuration, GUI (Tkinter), Events of the App.

    Single point of access to all the important parts of the app. Holds reference to all the components 
    of Biscuit and every class of biscuit have a reference back to this `base` class.
    i.e. `self.base` is the reference to this class from any other class of biscuit.

    Usage
    -----
    
    Example: In order to access the open editor from the git:

        class Git:
            def foo(self):
                editor = self.base.editorsmanager.active_editor 
                if editor.content and editor.content.exists:
                    print(editor.path)
    
    Example: Accessing the active editor instance from Foo class of biscuit: 
        
        class Foo:
            def foo(self):
                editor = self.base.editorsmanager.active_editor 
                if (editor.content and editor.content.exists):
                    print(editor.path)
                    if (editor.content.editable):
                        self.base.notifications.info(":)")
    """

    def __init__(self, appdir: str="", dir: str="", *args, **kwargs) -> None:
        """
        Parameters
        ----------
        appdir
            the directory where the app executable is at
        dir
            optional argument to open a folder from cli
        """
        
        super().__init__(*args, **kwargs)
        self.base = self
        self.appdir = appdir

        self.setup()
        self.late_setup()
        self.initialize_editor(dir)      

    def run(self) -> None:
        self.mainloop()
        self.history.dump()
        self.extensions_manager.stop_server()

    def setup(self) -> None:
        self.initialized = False
        self.setup_path(self.appdir)
        self.setup_configs()
        self.setup_tk()

    def initialize_editor(self, dir: str) -> None:
        self.initialized = True

        self.palette.generate_help_actionset()
        self.logger.info('Initializing editor finished.')

        self.update_idletasks()
        self.menubar.update()
        self.set_title()
        self.open_directory(dir)
