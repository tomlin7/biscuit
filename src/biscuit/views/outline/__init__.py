from __future__ import annotations

import typing

import tarts as lsp

from src.biscuit.components.floating.palette import ActionSet

from ..sidebarview import SidebarView
from .outlinetree import OutlineTree

if typing.TYPE_CHECKING:
    from src.biscuit.components.editors.texteditor import Text

class Outline(SidebarView):
    def __init__(self, master, *args, **kwargs) -> None:
        self.__buttons__ = [('refresh',), ('collapse-all',), ('ellipsis',),]
        super().__init__(master, *args, **kwargs)
        self.__icon__ = 'symbol-class'
        self.name = 'Outline'

        self.tree = OutlineTree(self)
        self.add_item(self.tree)

    def update_symbols(self, tab: Text, response: list[lsp.DocumentSymbol]) -> str:
        return self.tree.update_symbols(tab, response)

    def get_actionset(self) -> ActionSet:
        ...
