from __future__ import annotations

import typing

import sansio_lsp_client as lsp

from biscuit.core.components.floating.palette import ActionSet

from ..sidebarview import SidebarView
from .outlinetree import OutlineTree

if typing.TYPE_CHECKING:
    from biscuit.core.components.editors.texteditor import Text

class Outline(SidebarView):
    def __init__(self, master, *args, **kwargs) -> None:
        self.__buttons__ = [('refresh',), ('collapse-all',), ('ellipsis',),]
        super().__init__(master, *args, **kwargs)
        self.__icon__ = 'symbol-class'

        self.tree = OutlineTree(self)
        self.add_widget(self.tree)

    def update_symbols(self, tab: Text, response: list[lsp.DocumentSymbol]) -> str:
        return self.tree.update_symbols(tab, response)

    def get_actionset(self) -> ActionSet:
        ...
