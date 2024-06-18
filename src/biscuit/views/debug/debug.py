import os
import tkinter as tk

from src.biscuit.common import ActionSet

from ..drawer_view import NavigationDrawerView
from .callstack import CallStack
from .placeholder import DebugPlaceholder
from .variables import Variables


# TODO: add debugger run controls to the view toolbar as well
class Debug(NavigationDrawerView):
    """A view that displays the debugger variables and call stack.

    - Each editor can have its own debugger.
    - If the editor has a debugger, the debug view will show the variables and call stack of the debugger.
    - Debugger run controls are displayed in the editor toolbar."""

    def __init__(self, master, *args, **kwargs) -> None:
        self.__actions__ = []
        super().__init__(master, *args, **kwargs)
        self.__icon__ = "bug"
        self.name = "Debug"

        self.variables = Variables(self)
        self.callstack = CallStack(self)

        self.placeholder = DebugPlaceholder(self)
        self.add_item(self.placeholder)

    def refresh(self):
        if e := self.base.editorsmanager.active_editor:
            if e.content and e.content.editable and e.content.debugger:
                return self.show()

        self.hide()

    def show(self):
        self.placeholder.pack_forget()
        self.add_item(self.variables)
        self.add_item(self.callstack)

    def hide(self):
        self.variables.pack_forget()
        self.callstack.pack_forget()
        self.add_item(self.placeholder)
