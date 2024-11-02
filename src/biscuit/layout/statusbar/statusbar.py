from __future__ import annotations

import tkinter as tk
import typing

from pygments.lexers._mapping import LEXERS

from biscuit.common import ActionSet
from biscuit.common.icons import Icons
from biscuit.common.textutils import *
from biscuit.common.ui import Frame

from .activitybar import ActivityBar
from .button import SButton

if typing.TYPE_CHECKING:
    from biscuit.editor import Text


class Statusbar(Frame):
    """Status bar
    Status bar is a container for status information and controls, displayed at the bottom of the application.
    Holds various widgets that are used to display information about the current file and editor state.
    """

    def __init__(self, master: Frame, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.layout.statusbar.background)

        self.activitybar = ActivityBar(self)
        self.activitybar.pack(side=tk.LEFT, padx=(10, 0))

        # self.terminal_toggle = self.add_button(
        #     icon="symbol-class",
        #     callback=self.toggle_sidebar,
        #     description="Toggle terminal",
        #     side=tk.LEFT,
        # )
        # self.terminal_toggle.config(padx=10)
        # self.terminal_toggle.show()

        # TODO: making this more , Make default lists of buttons, map them with pack(bool), callback
        # also make an active_editor-specific/global lists of buttons to show/hide in bulk

        # ---------------------------------------------------------------------
        self.branch = self.add_button(
            text="main",
            icon=Icons.SOURCE_CONTROL,
            callback=self.base.commands.change_git_branch,
            description="Checkout branch",
            side=tk.LEFT,
            padx=(2, 0),
        )

        # ---------------------------------------------------------------------
        self.process_indicator = self.add_button(
            text="setting up environment",
            icon=Icons.SYNC,
            description="enabling language extensions",
            side=tk.LEFT,
            padx=(2, 0),
        )

        # ---------------------------------------------------------------------
        self.lc_actionset = self.create_actionset(
            "Goto line in active editor",
            ":",
            pinned=[["goto line: {}", self.goto_line]],
        )
        self.line_col_info = self.add_button(
            text="1,1",
            callback=self.base.commands.goto_line_column,
            description="Go to Line/Column",
            side=tk.RIGHT,
        )

        # ---------------------------------------------------------------------
        self.indent_actionset = self.create_actionset(
            "Change indentation",
            "indent:",
            [
                ("2 spaces", lambda e=None: self.base.set_tab_spaces(2)),
                ("4 spaces", lambda e=None: self.base.set_tab_spaces(4)),
                ("8 spaces", lambda e=None: self.base.set_tab_spaces(8)),
            ],
            pinned=[
                ["custom: {} spaces", self.change_custom_indentation],
            ],
        )
        self.indentation = self.add_button(
            text=f"{self.base.tab_spaces}sp",
            callback=self.base.commands.change_indentation_level,
            description="Change indentation",
            side=tk.RIGHT,
        )

        # ---------------------------------------------------------------------
        self.encoding_actionset = self.create_actionset(
            "Change file encoding",
            "encoding:",
            [("UTF-8", lambda e=None: print("encoding UTF-8", e))],
        )
        self.encoding = self.add_button(
            text="UTF-8",
            callback=self.base.commands.change_encoding,
            description="Change encoding",
            side=tk.RIGHT,
        )

        # ---------------------------------------------------------------------
        self.eol_actionset = self.create_actionset(
            "Change End of Line sequence",
            "eol:",
            [(i.upper(), self.change_eol(val)) for i, val in eol_map.items()],
        )
        self.eol = self.add_button(
            text="CRLF",
            callback=self.base.commands.change_end_of_line_character,
            description="Change End of Line sequence",
            side=tk.RIGHT,
        )

        # ---------------------------------------------------------------------
        items = [
            (aliases[0], self.change_language(aliases[0]))
            for _, _, aliases, _, _ in LEXERS.values()
            if aliases
        ]
        self.language_actionset = self.create_actionset(
            "Change Language Mode", "language:", items
        )
        self.file_type = self.add_button(
            text="Plain Text",
            callback=self.base.commands.change_language_mode,
            description="Change Language Mode",
            side=tk.RIGHT,
        )

        # ---------------------------------------------------------------------

        self.secondary_activitybar = ActivityBar(self)
        self.secondary_activitybar.pack(side=tk.RIGHT, padx=(0, 10))

        # ---------------------------------------------------------------------

        self.panel_toggle = SButton(
            self,
            icon=Icons.LAYOUT_PANEL_OFF,
            callback=self.toggle_panel,
            description="Toggle panel",
            icon2=Icons.LAYOUT_PANEL,
        )
        self.panel_toggle.set_pack_data(side=tk.RIGHT, padx=(0, 10))

        self.panel_toggle.show()

    def add_button(
        self,
        text="",
        icon="",
        callback: typing.Callable = None,
        description="",
        highlighted=False,
        **kwargs,
    ) -> SButton:
        """Creates and configures an SButton.

        Args:
            text (str): The text to display on the button.
            icon (str, optional): The icon to display on the button.
            callback (typing.Callable, optional): The callback to call when the button is clicked.
            description (str, optional): The description of the button to display on hover.
            side (str, optional): The side to pack the button on. Defaults to tk.LEFT.
            padx (tuple, optional): The padding for the button on the x-axis. Defaults to (2, 0).

        Returns:
            SButton: The created SButton instance.
        """

        btn = SButton(
            self,
            text=text,
            icon=icon,
            callback=callback,
            description=description,
            highlighted=highlighted,
        )
        btn.set_pack_data(**kwargs)
        return btn

    def create_actionset(
        self, name: str, prefix: str, actions: list = [], pinned: list = []
    ) -> ActionSet:
        """Creates and registers an ActionSet.

        Args:
            name (str): The name of the action set.
            prefix (str): The prefix for the action set.
            actions (list): A list of actions to include in the action set.

        Returns:
            ActionSet: The created ActionSet instance.
        """
        actionset = ActionSet(name, prefix, actions, pinned=pinned)
        self.base.palette.register_actionset(lambda: actionset)
        return actionset

    def toggle_sidebar(self) -> None:
        """Toggles the sidebar visibility."""

        self.base.root.toggle_sidebar()

    def toggle_panel(self) -> None:
        """Toggles the panel visibility."""

        self.base.toggle_terminal()

    def toggle_editmode(self, state: bool) -> None:
        """Toggles the edit mode for the status bar.

        Args:
            state (bool): If True, shows edit mode related widgets. Otherwise, hides them.
        """

        widgets = [
            self.file_type,
            # TODO: EOL, Encoding should be optional
            # self.eol,
            # self.encoding,
            self.indentation,
            self.line_col_info,
        ]
        for widget in widgets:
            widget.show() if state else widget.hide()

    def update_git_info(self) -> None:
        """Updates the Git branch information displayed on the status bar."""

        if self.base.git_found:
            self.branch.show()
            self.branch.change_text(f"{self.base.git.active_branch}")
        else:
            self.branch.hide()

    def on_open_file(self, text: Text) -> None:
        """Updates the status bar information when a file is opened.

        Args:
            text (Text): The text object representing the opened file.
        """

        self.file_type.change_text(text.language)
        # self.encoding.change_text(text.encoding.upper())
        # self.eol.change_text(get_eol_label(text.eol))

    def set_line_col_info(self, line: int, col: int, selected: int = None) -> None:
        """Sets the line and column information on the status bar.

        Args:
            line (int): The current line number.
            col (int): The current column number.
            selected (int): The number of selected characters.
        """

        self.line_col_info.change_text(
            f"{line},{col} "  # + (f"({selected})" if selected else "")
        )

    def set_encoding(self, encoding: str) -> None:
        """Sets the file encoding displayed on the status bar.

        Args:
            encoding (str): The encoding to display.
        """

        self.encoding.change_text(text=encoding.upper())

    def set_spaces(self, spaces: int) -> None:
        """Sets the indentation spaces displayed on the status bar.

        Args:
            spaces (int): The number of spaces to set for indentation.
        """

        self.indentation.change_text(text=f"{spaces}sp")

    def pack(self):
        """Packs the status bar into the application."""

        super().pack(fill=tk.X, pady=(1, 0))

    def goto_line(self, line: str) -> None:
        """Goes to a specific line in the active editor.

        Args:
            line (str): The line number to go to.
        """

        if line and line.isnumeric():
            self.base.editorsmanager.active_editor.content.goto_line(int(line))
        else:
            print("failed goto line", line)

    def change_custom_indentation(self, line: str = None) -> None:
        """Changes the indentation to a custom number of spaces.

        Args:
            line (str, optional): The number of spaces for indentation.
        """

        if line and line.strip().isnumeric():
            self.base.set_tab_spaces(int(line.strip()))
        else:
            print("failed change indentation", line)

    def change_eol(self, val: str) -> typing.Callable:
        """Palette helper function
        Changes the end-of-line sequence.

        Args:
            val (str): The end-of-line sequence to change to.

        Returns:
            typing.Callable: A callable that changes the end-of-line sequence.
        """

        return lambda _: self.base.editorsmanager.active_editor.content.text.change_eol(
            eol=val
        )

    def change_language(self, language: str) -> typing.Callable:
        """Palette helper function
        Changes the language mode of the active editor.

        Args:
            language (str): The language mode to change to.

        Returns:
            typing.Callable: A callable that changes the language mode.
        """

        return lambda _: self.base.editorsmanager.active_editor.content.text.highlighter.change_language(
            language
        )
