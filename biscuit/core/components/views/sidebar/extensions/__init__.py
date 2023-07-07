import tkinter as tk

from .results import Results
from ..sidebarview import SidebarView

from core.components.utils import Entry, Frame


class Extensions(SidebarView):
    def __init__(self, master, *args, **kwargs):
        self.__buttons__ = (('refresh',), ('clear-all',), ('collapse-all',))
        super().__init__(master, *args, **kwargs)
        self.__icon__ = 'extensions'

        self.container = Frame(self, **self.base.theme.views.sidebar)
        self.container.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        self.searchterm = tk.StringVar(self)

        self.searchbox = Entry(self.container, hint="Search extensions")
        self.searchbox.pack(fill=tk.X, anchor=tk.N, pady=2)
        
        self.results = Results(self, **self.base.theme.views.sidebar.item)
        self.results.pack(fill=tk.BOTH, expand=True)

    def replace(self):
        ...
