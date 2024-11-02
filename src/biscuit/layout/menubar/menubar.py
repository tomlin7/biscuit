from __future__ import annotations

import platform
import tkinter as tk
import typing

from biscuit.common import Menu
from biscuit.common.icons import Icons
from biscuit.common.ui import Frame, IconButton
from biscuit.common.ui.bubble import Bubble

from .item import MenubarItem
from .notification import Notifications
from .searchbar import SearchBar

if typing.TYPE_CHECKING:
    ...


class Menubar(Frame):
    """Menubar of the application

    - Contains the MenubarItems
    - Manages the MenubarItems
    """

    def __init__(self, master: Frame, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.menus: list[MenubarItem] = []
        self.events = self.base.commands

        # structure of the menubar

        # |---left container---|---searchbar---|---right container---|

        self.container = Frame(self, **self.base.theme.layout.menubar)
        self.container.pack(side=tk.LEFT, fill=tk.BOTH)

        self.searchbar = SearchBar(self)
        self.searchbar.place(relx=0.5, rely=0.5, anchor=tk.CENTER)

        self.container_right = Frame(self, **self.base.theme.layout.menubar)
        self.container_right.pack(side=tk.RIGHT, fill=tk.BOTH)

        self.notifications = Notifications(self.container_right)
        self.notifications.pack(side=tk.LEFT, fill=tk.BOTH)

        # make this custom titlebar for windows
        if platform.system() == "Windows":
            close = IconButton(
                self.container_right,
                icon=Icons.CHROME_CLOSE,
                iconsize=12,
                padx=15,
                pady=8,
                event=self.events.quit_biscuit,
            )
            close.config(activebackground="#e81123", activeforeground="white")
            close.pack(side=tk.RIGHT, fill=tk.Y, padx=0)

            IconButton(
                self.container_right,
                icon=Icons.CHROME_MAXIMIZE,
                iconsize=12,
                icon2=Icons.CHROME_RESTORE,
                padx=15,
                pady=8,
                event=self.events.maximize_biscuit,
            ).pack(side=tk.RIGHT, fill=tk.Y, padx=0)
            IconButton(
                self.container_right,
                icon=Icons.CHROME_MINIMIZE,
                iconsize=12,
                padx=15,
                pady=8,
                event=self.events.minimize_biscuit,
            ).pack(side=tk.RIGHT, fill=tk.Y, padx=0)
            self.config_bindings()

        self.update_idletasks()

        self.config(**self.base.theme.layout.menubar)
        self.add_menus()

    def update_notifications(self) -> None:
        """Updates the notifications icon and description on the status bar."""

        n = self.base.notifications.count
        self.notifications.set_icon(Icons.BELL_DOT if n else Icons.BELL)
        self.notifications.bubble.change_text(
            f"{n} notifications" if n else "No notifications"
        )

    def change_title(self, title: str) -> None:
        """Change the title of the searchbar

        Args:
            title (str): Title of the searchbar"""

        self.searchbar.label.change_text(title)

    def config_bindings(self) -> None:
        self.bind("<Map>", self.events.window_mapped)
        self.bind("<Button-1>", self.start_move)
        self.bind("<ButtonRelease-1>", self.stop_move)
        self.bind("<B1-Motion>", self.moving)

    def start_move(self, event) -> None:
        self.x = event.x
        self.y = event.y

    def stop_move(self, _) -> None:
        self.x = None
        self.y = None

    def moving(self, event: tk.Event) -> None:
        x = event.x_root - self.x
        y = event.y_root - self.y
        self.base.geometry(f"+{x}+{y}")

    def add_menu(self, text: str) -> Menu:
        """Add a new menu to the menubar

        Args:
            text (str): Text of the menu"""

        new_menu = MenubarItem(self, text)
        new_menu.pack(side=tk.LEFT, fill=tk.BOTH, in_=self.container)
        self.menus.append(new_menu)

        return new_menu.menu

    def add_menus(self) -> None:
        self.add_file_menu()
        self.add_edit_menu()
        self.add_view_menu()
        self.add_help_menu()

    def add_file_menu(self) -> None:
        events = self.events

        self.file_menu = self.add_menu("File")
        self.file_menu.add_command("New File", events.new_file)
        self.file_menu.add_command("New Window", events.new_window)
        self.file_menu.add_separator()
        self.file_menu.add_command("Open File", events.open_file)
        self.file_menu.add_command("Open Folder", events.open_directory)
        self.file_menu.add_command("Open Recent File...", events.open_recent_file)
        self.file_menu.add_command("Open Recent Folder...", events.open_recent_dir)
        self.file_menu.add_separator()
        self.file_menu.add_command("Open workspace...", events.open_workspace)
        self.file_menu.add_command(
            "Add Folder to Workspace...", events.add_folder_to_workspace
        )
        self.file_menu.add_command("Save Workspace As...", events.save_workspace_as)
        self.file_menu.add_command("Close Workspace", events.close_workspace)
        self.file_menu.add_separator()
        self.file_menu.add_command("Save", events.save_file)
        self.file_menu.add_command("Save As...", events.save_file_as)
        self.file_menu.add_command("Save All", events.save_all)
        self.file_menu.add_separator()
        self.file_menu.add_command("Preferences", events.open_settings)
        self.file_menu.add_separator()
        self.file_menu.add_command("Close Editor", events.close_editor)
        self.file_menu.add_command("Close Folder", events.close_folder)
        self.file_menu.add_command("Close Window", events.quit_biscuit)
        self.file_menu.add_separator()
        self.file_menu.add_command("Exit", events.quit_biscuit)

    def add_edit_menu(self) -> None:
        events = self.events

        self.edit_menu = self.add_menu("Edit")
        self.edit_menu.add_command("Undo", events.undo)
        self.edit_menu.add_command("Redo", events.redo)
        self.edit_menu.add_separator()
        self.edit_menu.add_command("Cut", events.cut)
        self.edit_menu.add_command("Copy", events.copy)
        self.edit_menu.add_command("Paste", events.paste)
        self.edit_menu.add_separator()
        self.edit_menu.add_command("Find", events.find_symbol)
        self.edit_menu.add_command("Replace", events.replace_symbol)
        self.edit_menu.add_command("Find in Files", events.search_files)
        self.edit_menu.add_command("Go to Line/Column...", events.goto_line_column)
        self.edit_menu.add_separator()
        self.edit_menu.add_command("Change Language Mode", events.change_language_mode)
        self.edit_menu.add_checkable("Word Wrap", events.toggle_wordwrap)
        self.edit_menu.add_checkable("Block Cursor", events.toggle_block_cursor)
        self.edit_menu.add_checkable(
            "Toggle Relative Line Numbering", events.toggle_relative_line_numbering
        )

    def add_view_menu(self) -> None:
        events = self.events

        self.view_menu = self.add_menu("View")
        # TODO: Add the rest of the view menu items
        self.view_menu.add_command("Command Palette...", events.show_command_palette)
        self.view_menu.add_command("Explorer", events.show_explorer)
        self.view_menu.add_command("Outline", events.show_outline)
        self.view_menu.add_command("Search", events.show_search)
        self.view_menu.add_command("Source Control", events.show_source_control)
        self.view_menu.add_command("Extensions", events.show_extensions)
        self.view_menu.add_separator()
        self.view_menu.add_command("Terminal", events.show_terminal)
        self.view_menu.add_command("Log", events.show_logs)

    def add_help_menu(self) -> None:
        events = self.events

        self.help_menu = self.add_menu("Help")
        self.help_menu.add_command("Welcome", events.show_welcome)
        self.help_menu.add_command("Show All Commands", events.show_command_palette)
        self.help_menu.add_command("Documentation", events.open_biscuit_documentation)
        self.help_menu.add_command(
            "Show Release Notes", events.open_biscuit_release_notes
        )
        self.help_menu.add_separator()
        self.help_menu.add_command("Report Bug", events.report_bug)
        self.help_menu.add_command("Request Feature", events.request_feature)
        self.help_menu.add_separator()
        self.help_menu.add_command("View License", events.view_biscuit_licenses)
        self.help_menu.add_command(
            "Code of Conduct", events.open_biscuit_code_of_conduct
        )
        self.help_menu.add_separator()
        self.help_menu.add_command("About", events.show_about)

    def close_all_menus(self, *_) -> None:
        for btn in self.menus:
            btn.menu.hide()

    def switch_menu(self, item: MenubarItem) -> None:
        active = False
        for i in self.menus:
            if i.menu.active:
                active = True
            if i.menu != item.menu:
                i.menu.hide()
                i.deselect()

        if active:
            item.select()
            item.menu.show()

    def pack(self):
        super().pack(fill=tk.BOTH)
