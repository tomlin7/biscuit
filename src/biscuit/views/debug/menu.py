from __future__ import annotations

import typing

from biscuit.common import Menu

if typing.TYPE_CHECKING:
    from .variables import Variables


class VariablesContextMenu(Menu):
    def __init__(self, master: Variables, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master

        self.add_command("Copy Value", self.master.copy_value)
        self.add_command("Copy Expression", self.master.copy_expression)
        self.add_command("Copy Name", self.master.copy_name)

        self.add_separator()
        self.add_command("Set Value", self.master.set_value)

    def get_coords(self, e) -> list:
        return e.x_root, e.y_root

    def show(self, *e) -> None:
        super().show(*e)
