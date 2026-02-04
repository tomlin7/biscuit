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

        commonly_used.add_dropdown("Color Theme", ("dark", "light", "gruvbox_dark", "catppuccin_mocha"), 
                                   self.base.config.get_value("theme", "dark"),
                                   lambda v: self.base.config.set_value("theme", v))
        commonly_used.add_intvalue("Font Size", self.base.config.get_value("font_size", 12),
                                   lambda v: self.base.config.set_value("font_size", int(v) if v else 12))
        commonly_used.add_intvalue("UI Font Size", self.base.config.get_value("uifont_size", 10),
                                   lambda v: self.base.config.set_value("uifont_size", int(v) if v else 10))
        commonly_used.add_stringvalue("Font Family", self.base.config.get_value("font", "Fira Code"),
                                   lambda v: self.base.config.set_value("font", v))
        commonly_used.add_intvalue("Tab Size", self.base.config.get_value("tab_size", 4),
                                   lambda v: self.base.config.set_value("tab_size", int(v) if v else 4))

    def add_text_editor(self):
        """Add text editor settings to the settings editor"""

        text_editor = self.add_section(f"Text Editor")
        text_editor.add_checkbox("Relative Line Numbers", self.base.config.get_value("relative_line_numbers", False),
                                   lambda v: self.base.config.set_value("relative_line_numbers", v))
        text_editor.add_checkbox("Auto Save", self.base.config.get_value("auto_save", False),
                                   lambda v: self.base.config.set_value("auto_save", v))
        text_editor.add_checkbox("Auto Closing Pairs", self.base.config.get_value("auto_closing_pairs", True),
                                   lambda v: self.base.config.set_value("auto_closing_pairs", v))
        text_editor.add_checkbox("Auto Closing Delete", self.base.config.get_value("auto_closing_delete", True),
                                   lambda v: self.base.config.set_value("auto_closing_delete", v))
        text_editor.add_checkbox("Auto Indent", self.base.config.get_value("auto_indent", True),
                                   lambda v: self.base.config.set_value("auto_indent", v))
        text_editor.add_checkbox("Auto Surround", self.base.config.get_value("auto_surround", True),
                                   lambda v: self.base.config.set_value("auto_surround", v))
        text_editor.add_checkbox("Word Wrap", self.base.config.get_value("word_wrap", False),
                                   lambda v: self.base.config.set_value("word_wrap", v))
        text_editor.add_dropdown("Cursor Style", ("line", "block", "underline"),
                                   self.base.config.get_value("cursor_style", "line"),
                                   lambda v: self.base.config.set_value("cursor_style", v))

    def add_section(self, name: str) -> Section:
        """Add a section to the settings editor

        Args:
            name (str): name of the section

        Returns:
            Section: section to add items to"""

    def add_section(self, name: str) -> Section:
        """Add a section to the settings editor

        Args:
            name (str): name of the section

        Returns:
            Section: section to add items to"""

        section = Section(self.container.content, name)
        section.pack(fill=tk.X, expand=True)
        self.sections.append(section)

        shortcut = Button(self.tree, name, anchor=tk.W, command=lambda *_: self.scroll_to_section(section))
        shortcut.pack(fill=tk.X)
        shortcut.config(**self.base.theme.editors.button)

        return section

    def scroll_to_section(self, section: Section):
        """Scrolls to the specified section."""
        # Using update_idletasks to ensure geometry is up to date
        self.update_idletasks()
        
        # Calculate the y-position of the section relative to the content frame
        y_pos = section.winfo_y()
        
        # Calculate the total height of the scrollable content
        total_height = self.container.content.winfo_height()
        
        # Avoid division by zero
        if total_height == 0:
            return

        # Calculate the scroll fraction (0.0 to 1.0)
        fraction = y_pos / total_height
        
        # Scroll the canvas
        self.container.canvas.yview_moveto(fraction)

    def show_result(self, term: str):
        """Show the search results in the settings editor

        Args:
            term (str): the search term"""
        
        term = term.lower()
        
        for section in self.sections:
            visible_items = 0
            for item in section.items:
                if term in item.name.lower():
                    item.pack(fill=tk.X, expand=True)
                    visible_items += 1
                else:
                    item.pack_forget()
            
            if visible_items > 0:
                section.pack(fill=tk.X, expand=True)
            else:
                section.pack_forget()

    def show_no_results(self):
        """Show no results found message in the settings editor"""
        # TODO implement this
        pass
