import tkinter as tk

from .button import Button
from .entrybox import EntryBox


class ReplaceBox(EntryBox):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)

        self.btn_frame = tk.Frame(self, bg="#ffffff")
        self.btn_frame.grid(row=0, column=1, sticky=tk.NSEW)
        
        self.keep_case = Button(self.btn_frame, bg="#ffffff", hbg="#e9e9e9", img=tk.PhotoImage(data="""
        iVBORw0KGgoAAAANSUhEUgAAABAAAAAKCAYAAAC9vt6cAAAACXBIWXMAAABfAAAAXwEqnu0dAAAAGXRFWHRTb2Z0d2FyZQB
        3d3cuaW5rc2NhcGUub3Jnm+48GgAAAYVJREFUKJFtkD1rVGEQhZ957xsEQ2ysRTBcNteQzUbQLIKFIJgfkGXzBwTBRv+Ajb
        WgAW1E7MRixSIgaIpYuJrrLmY/JO4HWNkIEgu/MHrfY7O5RrLTzXDmmXPG2Fdpu78FlJS52fKpeHtv3ugMLgRpfdRmwGfQk
        x9HDl1ze6LNre0YSICmRaHCuFJYUsgSw10CV538+nslB7jIV0HPDR4IVsbtG/5jeeHk8Mx8vGZSU9LxHCCpAlYLbuKxQfym
        NZwd6wJodofTMhaEe+YAGu1eAZjZtV9r5bkTn4C67GAMWXYvbfXrWQhNoD7ld986gExWxVg/Vyx+GSlrjIth9tDQbeAWcPF
        bFq16AGcsS8Rpe7AzuuWBqVed93Nni0k3/xP29HSp8AFgs9XzhrviX3cHiYISifO47Oc/v+6uI6oAOeB/M/YH9N27oKqJjc
        VS4eV+QdrpP0K6DFzPmdixRrs3EbBF4KrgvseoSLZ68EJUk7Kb6bv+PGEEUHghDGAHdOfo4ejGX3P9oluH0boRAAAAAElFT
        kSuQmCC"""))
        
        self.keep_case.grid(row=0, column=0, sticky=tk.NSEW, pady=2, padx=(3, 1))
