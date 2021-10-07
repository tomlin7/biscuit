import tkinter as tk

import lib.containers.base as containers

from lib.editor import Editor
from vendor.tkterminal import Terminal

root = tk.Tk()

base = containers.BasePane()
base.pack(fill=tk.BOTH, expand=1)

root.mainloop()