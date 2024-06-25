from biscuit.common.ui import Frame, IconButton


class BaseGame(Frame):
    """Base class for games.

    Games may inherit from this class and implement the following methods:
    - `__init__`
    - `reload`

    Otherwise make sure to set the following attributes:
    - `path` (str): path to the game file
    - `filename` (str): name of the game file
    - `exists` (bool): whether the game file exists
    - `diff` (bool): whether the game file has been modified
    - `showpath` (bool): whether to display the path of the game file
    - `editable` (bool): whether the game file is editable
    - `__buttons__` (list): list of buttons to be added to the editor bar

    and implement the following methods:
    - `reload`: reload the game file
    - `save`: save the game file
    """

    def __init__(self, master, path=None, *args, **kwargs) -> None:
        """Initializes the game frame

        Args:
            master (tk.Tk): master window
            path (str): path to the game file
        """

        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.editors)
        self.path = path
        self.filename = None

        self.exists = False
        self.showpath = False
        self.diff = False
        self.editable = False

        self.__buttons__ = (("refresh", self.reload),)

    def add_buttons(self, icon, event) -> None:
        """Adds a button to the editor bar

        Args:
            icon (str): name of the icon
            event (function): function to be called on button press
        """

        self.__buttons__.append((icon, event))

    def create_buttons(self, editorbar) -> None:
        """Not to be called directly. Creates buttons for the editor bar"""

        self.__buttons__ = [
            IconButton(editorbar, *button) for button in self.__buttons__
        ]

    def reload(self, *_) -> None:
        """Reloads the game
        This method should be implemented by the subclass"""

        ...

    def save(self, *_) -> None:
        """Saves the game
        This method should be implemented by the subclass"""

        ...
