import os
import tkinter as tk

from biscuit.core.components.floating.palette import ActionSet
from biscuit.core.components.views.sidebar.debug.callstack import CallStack

from ..sidebarview import SidebarView
from .placeholder import DebugPlaceholder
from .variables import Variables


class Debug(SidebarView):
    """A view that displays the debugger variables and call stack. 

    Each editor can have its own debugger. If the editor has a debugger, the debug view 
    will show the variables and call stack of the debugger. Debugger run controls are 
    displayed in the editor toolbar."""
    
    def __init__(self, master, *args, **kwargs) -> None:
        self.__buttons__ = []
        super().__init__(master, *args, **kwargs)
        self.__icon__ = 'bug'
        self.name = 'Debug'
        
        self.variables = Variables(self)
        self.callstack = CallStack(self)

        self.placeholder = DebugPlaceholder(self)
        self.add_widget(self.placeholder)

    def refresh(self):
        """Refresh the debug view."""

        if e := self.base.editorsmanager.active_editor:
            if e.content and e.content.editable and e.content.debugger:
                return self.show()
    
        self.hide()

    def show(self):
        """Show the debug view."""

        self.placeholder.pack_forget()
        self.add_widget(self.variables)
        self.add_widget(self.callstack)

    def hide(self):
        """Hide the debug view and show the placeholder."""

        self.variables.pack_forget()
        self.callstack.pack_forget()
        self.add_widget(self.placeholder)
