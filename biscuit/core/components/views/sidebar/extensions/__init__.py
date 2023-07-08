import tkinter as tk

from .results import Results
from ..sidebarview import SidebarView

from core.components.utils import Entry, Frame


class Extensions(SidebarView):
    def __init__(self, master, *args, **kwargs):
        self.__buttons__ = (('refresh',), ('clear-all',), ('collapse-all',))
        super().__init__(master, *args, **kwargs)
        self.__icon__ = 'extensions'

        self.searchterm = tk.StringVar(self)

        self.searchbox = Entry(self, hint="Search extensions")
        self.searchbox.pack(fill=tk.X, anchor=tk.N, padx=10, pady=7)
        
        self.results = Results(self)
        self.add_widget(self.results)
