from biscuit.core.components.floating.palette import ActionSet
from biscuit.core.components.lsp.data import OutlineItem

from ..sidebarview import SidebarView
from .outlinetree import OutlineTree


class Outline(SidebarView):
    def __init__(self, master, *args, **kwargs) -> None:
        self.__buttons__ = [('refresh',), ('collapse-all',), ('ellipsis',),]
        super().__init__(master, *args, **kwargs)
        self.__icon__ = 'symbol-class'

        self.tree = OutlineTree(self)
        self.add_widget(self.tree)

    def update_symbols(self, response: list[OutlineItem]) -> str:
        return self.tree.update_symbols(response)

    def get_actionset(self) -> ActionSet:
        ...
