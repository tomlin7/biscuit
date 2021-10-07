import tkinter as tk

from lib.containers.base.top import TopPane
from lib.containers.base.bottom import BottomPane

def topsize(event):
    print(f"  ◆ Top: {event.widget.winfo_width()}x{event.widget.winfo_height()}")

def bottomsize(event):
    print(f"  ◆ Bottom: {event.widget.winfo_width()}x{event.widget.winfo_height()}")


class BasePane(tk.PanedWindow):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        self.configure(orient=tk.VERTICAL)

        self.top = TopPane(self, height=520)
        self.top.bind("<Configure>", topsize)
        self.bottom = BottomPane(self, height=280)
        self.bottom.bind("<Configure>", bottomsize)

        self.add(self.top)
        self.add(self.bottom)

        t = tk.Text(self.bottom)
        self.bottom.add(t)
