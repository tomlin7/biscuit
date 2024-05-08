from __future__ import annotations

import typing

from ..sidebarview import SidebarView
from .chat import Chat
from .placeholder import AIPlaceholder

if typing.TYPE_CHECKING:
    ...

class AI(SidebarView):
    def __init__(self, master, *args, **kwargs) -> None:
        self.__buttons__ = [('refresh',), ('ellipsis',),]
        super().__init__(master, *args, **kwargs)
        self.__icon__ = 'sparkle-filled'
        self.name = 'AI'

        self.placeholder = AIPlaceholder(self)
        self.add_widget(self.placeholder)

    def add_chat(self, api_key: str) -> None:
        self.api_key = api_key
        self.chat = Chat(self)
        
        self.add_widget(self.chat)
        self.placeholder.pack_forget()
