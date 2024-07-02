from .config import ConfigManager
from .events import EventManager
from .gui import GUIManager


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

    ```py
    class Git:
        def foo(self):
            editor = self.base.editorsmanager.active_editor
            if editor.content and editor.content.exists:
                print(editor.path)
    ```

    Example: Accessing the active editor instance from Foo class of biscuit:

    ```py
    class Foo:
        def foo(self):
            editor = self.base.editorsmanager.active_editor
            if (editor.content and editor.content.exists):
                print(editor.path)
                if (editor.content.editable):
                    self.base.notifications.info(":)")
    ```
    """

    def __init__(self, appdir: str = "", dir: str = "", *args, **kwargs) -> None:
        """Initialize the App.

        Args:
            appdir (str, optional): Directory of the app. Defaults to "".
            dir (str, optional): Directory to open in the editor. Defaults to "".
        """

        super().__init__(*args, **kwargs)
        self.base = self
        self.appdir = appdir

        self.setup()
        self.late_setup()
        self.initialize_app(dir)

    def run(self) -> None:
        """Start the main loop of the app."""

        self.mainloop()
        self.history.dump()
        self.extensions_manager.stop_server()

    def setup(self) -> None:
        """Setup the app."""

        self.initialized = False
        self.setup_path(self.appdir)
        self.setup_configs()
        self.initialize_tk()

    def initialize_app(self, dir: str) -> None:
        """Initialize the editor.

        Args:
            dir (str): Directory to open."""

        self.initialized = True

        self.palette.generate_help_actionset()
        self.logger.info("Initializing editor finished.")

        self.update_idletasks()
        self.menubar.update()
        self.set_title()
        self.open_directory(dir)

    def control_execute(self, text: str) -> None:
        try:
            return eval(text)
        except SyntaxError:
            try:
                exec(text)
            except Exception as e:
                return e
        except Exception as e:
            return e
