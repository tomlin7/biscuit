from __future__ import annotations

import typing

from .menu import Menu

if typing.TYPE_CHECKING:
    from biscuit import App


class TextEditorContextMenu(Menu):
    def __init__(self, master: App, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        commands = self.base.commands

        self.e = None

        self.add_command("Cut", commands.cut)
        self.add_command("Copy", commands.copy)
        self.add_command("Paste", commands.paste)

        self.add_separator()

        self.add_command("Rename Symbol", commands.rename_symbol)
        self.add_command("Toggle Comment", commands.toggle_comment)
        # self.add_command("Format Document", commands.format_document)
        # self.add_command("Format Selection", commands.format_selection)

        self.add_separator()

        self.add_command("Go to Definition", commands.go_to_symbol_definition)
        self.add_command("Go to References", commands.find_symbol_references)
        # self.add_command("Go to Declaration", commands.go_to_declaration)
        # self.add_command("Go to Type Definition", commands.go_to_type_definition)
        self.add_command("Go to Line/Column...", commands.goto_line_column)
        self.add_command("Go to Symbol in Editor", commands.show_symbol_palette)

        menu = self.add_menu("Selection").menu
        menu.add_command("Select All", commands.select_all)
        menu.add_command("Select Line", commands.select_line)
        menu.add_command("Delete Line", commands.delete_line)
        menu.add_separator()
        menu.add_command("Copy Line Up", commands.copy_line_up)
        menu.add_command("Copy Line Down", commands.copy_line_down)
        menu.add_command("Move Line Up", commands.move_line_up)
        menu.add_command("Move Line Down", commands.move_line_down)
        menu.add_command("Duplicate Selection", commands.duplicate_selection)

        self.add_separator()

        self.add_command("Command Palette...", commands.show_command_palette)

    def get_coords(self, e) -> list:
        return e.x_root, e.y_root

    def show(self, *e) -> None:
        self.e = e
        super().show(*e)
