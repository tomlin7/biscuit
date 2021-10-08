from tkinter import ttk
# import tkinter as tk

class EditorTabs(ttk.Notebook):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

# root = tk.Tk()
# t = EditorTabs(root)
# t.pack()

# t.add(tk.Text(), text="one")
# t.add(tk.Text(), text="two")

# root.mainloop()