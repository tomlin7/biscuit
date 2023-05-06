import tkinter as tk
from tkinter.constants import *

from ..sidebarview import SidebarView
from .changestree import ChangesTree

from ....utils import Button, IconButton
from .placeholder import ChangesTreePlaceholder

class SourceControl(SidebarView):
    def __init__(self, master, *args, **kwargs):
        self.__buttons__ = (('list-tree',), ('check',), ('refresh',), ('ellipsis',))
        self.__icon__ = 'source-control'
        super().__init__(master, *args, **kwargs)

        # self.placeholder = ChangesTreePlaceholder(self)
        # self.placeholder.pack(fill=BOTH, padx=(15, 10), pady=5)

        self.container = tk.Frame(self, bg='#f8f8f8')
        self.container.base = self.base
        self.container.pack(fill=BOTH, padx=(15, 10), pady=5)

        self.commit_message = tk.StringVar()
        self.commit_message.set('Message')
        self.commit_message_entry = tk.Entry(self.container, textvariable=self.commit_message, relief=tk.FLAT, bd=5, bg='white')
        self.commit_message_entry.pack(fill=X, pady=(0, 5))

        self.commit_button = Button(self.container, text='Commit')
        self.commit_button.pack(fill=BOTH, side=LEFT, expand=True)
        tk.Label(self.container, text="｜", fg='white', bg="#dc8c34").pack(side=LEFT, fill=Y)
        self.more = IconButton(self.container, icon='chevron-down', 
            bg="#dc8c34", fg="white", activebackground="#ffaf3c", activeforeground="white")
        self.more.pack(fill=Y)

        self.tree = ChangesTree(self)
        self.add_widget(self.tree)
