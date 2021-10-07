import tkinter as tk

from lib.components.containers.top.left import TopLeftPane
from lib.components.containers.top.right import TopRightPane

# Debug
def leftsize(event):
    print(f"    ◇ Left: {event.widget.winfo_width()}x{event.widget.winfo_height()}")

def rightsize(event):
    print(f"    ◇ Right: {event.widget.winfo_width()}x{event.widget.winfo_height()}")


class TopPane(tk.PanedWindow):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # config
        # self.configure(orient=tk.HORIZONTAL)

        self.left = TopLeftPane(self, width=290)
        self.right = TopRightPane(self, width=990)

        # Debug
        # self.left.bind("<Configure>", leftsize)
        # self.right.bind("<Configure>", rightsize)

        self.add(self.left)
        self.add(self.right)
