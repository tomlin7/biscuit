import tkinter as tk


class Bubble(tk.Toplevel):
    """
     +===============+
    ||      Text     ||
     +===============+
    """
    def __init__(self, master, text, border='#dddbdd', bg="#f8f8f8", bd=1, *args, **kw):
        super().__init__(master, bg=border, *args, **kw)
        self.overrideredirect(True)
        tk.Label(self, text=text, bg=bg, padx=5, pady=5).pack(padx=bd, pady=bd)
        self.withdraw()

    def show(self, *_):
        self.update_idletasks()
        self.geometry(f"+{self.master.winfo_rootx() + self.master.winfo_width() + 5}" +
                             f"+{int(self.master.winfo_rooty() + (self.master.winfo_height() - self.winfo_height())/2)}")
        self.deiconify()
    
    def hide(self, *_):
        self.withdraw()
