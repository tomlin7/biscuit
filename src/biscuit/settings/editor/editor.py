import tkinter as tk

from biscuit.common.ui import Button, Frame, ScrollableFrame
from biscuit.editor import BaseEditor

from .searchbar import Searchbar
from .section import Section


class SettingsEditor(BaseEditor):
    """Settings editor for changing the settings of the editor.

    - Add sections for different settings
    - Add items for each section to change the settings
    - Search through the settings to find the desired
    """

    name = "settings"

    def __init__(self, master, exists=False, editable=False, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=100, pady=20, **self.base.theme.editors)
        self.filename = "Settings"

        # TODO searchbar functionality not implemented yet
        # unpack the container and pack a new container for showing results
        self.search = Searchbar(self)
        self.search.pack(fill=tk.X)

        frame = Frame(self, bg=self.base.theme.border)
        frame.pack(fill=tk.BOTH, expand=True)

        self.tree = Frame(frame, **self.base.theme.editors, width=200, pady=20)
        self.tree.pack_propagate(False)
        self.tree.pack(fill=tk.Y, side=tk.LEFT, padx=(0, 1))

        self.sections = []
        self.container = ScrollableFrame(frame)
        self.container.content.config(pady=10)
        self.container.config(**self.base.theme.editors)
        self.container.pack(fill=tk.BOTH, expand=True)

        self.add_sections()

    def add_sections(self):
        self.add_commonly_used()
        self.add_text_editor()

    def add_commonly_used(self):
        """Add commonly used settings to the settings editor"""

        commonly_used = self.add_section(f"Commonly Used")

        commonly_used.add_dropdown("Color Theme", ("dark", "light"))
        commonly_used.add_intvalue("Font Size", 14)
        commonly_used.add_stringvalue("Font Family", "Consolas")
        commonly_used.add_intvalue("Tab Size", 4)

    def add_text_editor(self):
        """Add text editor settings to the settings editor"""

        commonly_used = self.add_section(f"Text Editor")
        commonly_used.add_checkbox("Auto Save", False)
        commonly_used.add_checkbox("Auto Closing Pairs", True)
        commonly_used.add_checkbox("Auto Closing Delete", True)
        commonly_used.add_checkbox("Auto Indent", True)
        commonly_used.add_checkbox("Auto Surround", True)
        commonly_used.add_checkbox("Word Wrap", False)

    def add_section(self, name: str) -> Section:
        """Add a section to the settings editor

        Args:
            name (str): name of the section

        Returns:
            Section: section to add items to"""

        section = Section(self.container.content, name)
        section.pack(fill=tk.X, expand=True)
        self.sections.append(section)

        shortcut = Button(self.tree, name, anchor=tk.W)
        shortcut.pack(fill=tk.X)
        shortcut.config(**self.base.theme.editors.button)

        return section

    def show_result(self, items):
        """Show the search results in the settings editor

        Args:
            items (list): list of items to show in the settings editor"""

        if not any(items):
            return self.show_no_results()

    def show_no_results(self):
        """Show no results found message in the settings editor"""
        ...
