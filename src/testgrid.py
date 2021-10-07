import tkinter as tk

import lib.containers.base as containers

from lib.editor import Editor
from vendor.tkterminal import Terminal

def size(event):
    print(f"■ Root: {event.widget.winfo_width()}x{event.widget.winfo_height()}")

root = tk.Tk()

base = containers.BasePane(root, width=1290, height=800)
base.pack(fill=tk.BOTH, expand=1)

root.bind("<Configure>", size)
root.mainloop()