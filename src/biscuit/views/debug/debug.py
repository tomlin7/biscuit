import tkinter as tk

from ..drawer_view import NavigationDrawerView
from .actions import DebuggerActions
from .callstack import CallStack
from .placeholder import DebugPlaceholder
from .variables import Variables


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
        self.running = False

        self.actionbar = DebuggerActions(self)
        self.variables = Variables(self)
        self.callstack = CallStack(self)

        self.placeholder = DebugPlaceholder(self)
        self.add_item(self.placeholder)

    def refresh(self):
        if e := self.base.editorsmanager.active_editor:
            if e.content and e.content.editable and e.content.debugger:
                return self.show()

        self.hide()

    def set_running(self):
        self.running = True
        self.add_item(
            self.actionbar, fill=tk.Y, anchor=tk.CENTER, before=self.variables
        )

    def set_stopped(self):
        self.running = False
        self.actionbar.pack_forget()

    def set_paused(self):
        self.actionbar.pause_btn.toggle_icon()

    def reset(self):
        self.set_stopped()
        self.actionbar.pause_btn.reset_icon()
        self.variables.clear()
        self.callstack.clear()

    def show(self):
        self.placeholder.pack_forget()
        self.add_item(self.variables)
        self.add_item(self.callstack)

    def hide(self):
        self.actionbar.pack_forget()
        self.variables.pack_forget()
        self.callstack.pack_forget()
        self.add_item(self.placeholder)
