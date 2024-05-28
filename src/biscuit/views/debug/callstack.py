import tkinter as tk

from src.biscuit.utils import Tree

from ..sidebaritem import SidebarViewItem


class CallStack(SidebarViewItem):
    """A view that displays the local variables of the debugger.
    Callstack is populated when the debugger is running only."""

    def __init__(self, master, *args, **kwargs) -> None:
        self.title = 'Callstack'
        self.__buttons__ = ()
        super().__init__(master, itembar=True, *args, **kwargs)

        self.tree = Tree(self.content, cursor='hand2')
        self.tree.grid(row=0, column=0, sticky=tk.NSEW)
        
    def show(self, frame):
        """Show the call stack from the given frame.

        Args:
            frame (frame): The frame to show the call stack from."""

        self.clear()
        while frame:
            callstack_str = f"{frame.f_code.co_name} at {frame.f_code.co_filename}, line {frame.f_lineno}\n"
            self.tree.add(text=callstack_str)
            frame = frame.f_back
    
    def clear(self):
        """Clear the call stack."""
        
        self.tree.delete(*self.tree.get_children())
