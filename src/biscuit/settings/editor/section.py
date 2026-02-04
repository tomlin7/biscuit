import tkinter as tk

from biscuit.common.ui import Frame

from .items import CheckboxItem, DropdownItem, IntegerItem, StringItem


class Section(Frame):
    """Section for the settings editor to group the items together.

    - Add items to the section to change the settings
    - Add a title to the section to describe the settings
    """

    def __init__(self, master, title="", *args, **kwargs) -> None:
        """Initialize the section with a title

        Args:
            master (tk.Tk): root window
            title (str, optional): title of the section. Defaults to"""

        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.editors, padx=30)

        self.items = []
        tk.Label(
            self,
            text=title,
            font=("Segoi UI", 22, "bold"),
            anchor=tk.W,
            **self.base.theme.editors.labels
        ).pack(fill=tk.X, expand=True)

    def add_dropdown(
        self, name="Example", options=["True", "False"], default=0, callback=None
    ) -> None:
        """Add a dropdown item to the section

        Args:
            name (str, optional): name of the dropdown. Defaults to "Example".
            options (list, optional): list of options for the dropdown. Defaults to ["True", "False"].
            default (int, optional): default value of the dropdown. Defaults to 0.
            callback (function, optional): callback function to be called when the value is changed.
        """

        dropdown = DropdownItem(self, name, options, default, callback)
        dropdown.pack(fill=tk.X, expand=True)
        self.items.append(dropdown)

    def add_stringvalue(self, name="Example", default="placeholder", callback=None) -> None:
        """Add a string text box item to the section

        Args:
            name (str, optional): name of the string. Defaults to "Example".
            default (str, optional): default value of the string. Defaults to "placeholder".
            callback (function, optional): callback function to be called when the value is changed.
        """

        string = StringItem(self, name, default, callback)
        string.pack(fill=tk.X, expand=True)
        self.items.append(string)

    def add_intvalue(self, name="Example", default="0", callback=None) -> None:
        """Add an integer text box item to the section

        Args:
            name (str, optional): name of the integer. Defaults to "Example".
            default (int, optional): default value of the integer. Defaults to "0".
            callback (function, optional): callback function to be called when the value is changed.
        """

        int = IntegerItem(self, name, default, callback)
        int.pack(fill=tk.X, expand=True)
        self.items.append(int)

    def add_checkbox(self, name="Example", default=True, callback=None) -> None:
        """Add a checkbox item to the section

        Args:
            name (str, optional): name of the checkbox. Defaults to "Example".
            default (bool, optional): default value of the checkbox. Defaults to True.
            callback (function, optional): callback function to be called when the value is changed.
        """

        dropdown = CheckboxItem(self, name, default, callback)
        dropdown.pack(fill=tk.X, expand=True)
        self.items.append(dropdown)
