from __future__ import annotations

import typing

import tarts as lsp

from biscuit.common import ActionSet

from ..sidebar_view import SideBarView
from .outlinetree import OutlineTree

if typing.TYPE_CHECKING:
    from biscuit.editor import Text


class Outline(SideBarView):
    """View that displays the outline of the active document.

    The Outline view displays the outline of the active document.
    - The user can click on a symbol to navigate to it.
    """

    def __init__(self, master, *args, **kwargs) -> None:
        self.__actions__ = [
            ("refresh",),
            ("collapse-all",),
            ("ellipsis",),
        ]
        super().__init__(master, *args, **kwargs)
        self.__icon__ = "symbol-class"
        self.name = "Outline"

        self.tree = OutlineTree(self)
        self.add_item(self.tree)

    def update_symbols(self, tab: Text, response: list[lsp.DocumentSymbol]) -> str:
        return self.tree.update_symbols(tab, response)

    def get_actionset(self) -> ActionSet: ...
