import tkinter as tk

from src.biscuit.utils import Tree

from ..sidebaritem import SidebarViewItem


class Variables(SidebarViewItem):
    """A view that displays the local variables of the debugger.
    Variables are populated when the debugger is running only."""
    
    def __init__(self, master, *args, **kwargs) -> None:
        self.title = 'Variables'
        self.__buttons__ = ()
        super().__init__(master, itembar=True, *args, **kwargs)

        self.tree = Tree(self.content, *args, **kwargs)
        self.tree.grid(row=0, column=0, sticky=tk.NSEW)
        
    def show(self, frame):
        """Show the local variables in the given frame.
        
        Args:
            frame (frame): The frame to show the local variables of."""

        self.clear()
        for var, val in frame.f_locals.items():
            locals_str = f"{var}: {val}"
            self.tree.add(text=locals_str)
    
    def clear(self):
        """Clear the local variables."""
        
        self.tree.delete(*self.tree.get_children())
