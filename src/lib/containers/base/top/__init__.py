import tkinter as tk

from lib.containers.base.top.left import TopLeftPane
from lib.containers.base.top.right import TopRightPane

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
        self.left.bind("<Configure>", leftsize)
        self.right = TopRightPane(self, width=990)
        self.right.bind("<Configure>", rightsize)

        self.add(self.left)
        self.add(self.right)

        t1 = tk.Text(self.left, height=25, width=25)
        self.left.add(t1)

        t2 = tk.Text(self.right, height=25, width=75)
        self.right.add(t2)
