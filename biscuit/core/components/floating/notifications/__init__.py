import tkinter as tk

from ...utils import IconButton


class Notifications(tk.Toplevel):
    """
    Floating notifications, shown on bottom right corner
    NOTE: Currently only supports showing one notification at a time

    """
    def __init__(self, base):
        super().__init__(base)
        self.master = base
        self.base = base

        self.attributes("-toolwindow", True)
        self.overrideredirect(True)

        self.offset = 10
        self.minsize(width=400, height=1)

        self.icon = IconButton(self, 'info', padx=5)
        self.icon.pack(side=tk.LEFT, fill=tk.BOTH)

        self.label = tk.Label(self, text="NO NEW NOTIFICATIONS", anchor=tk.W, padx=10)
        self.label.pack(side=tk.LEFT, expand=1, fill=tk.BOTH)

        close_button = IconButton(self, "chevron-down")
        close_button.pack(side=tk.RIGHT, fill=tk.BOTH)
        close_button.bind('<Button-1>', self.hide)

        self.bind("<Configure>", self._follow_root)
        self.bind("<Map>", self._follow_root)
        self.withdraw()
    
    def info(self, text):
        self.icon.set_icon("info")
        self.label.configure(text=text)
        self.show()
    
    def warning(self, text):
        self.icon.set_icon("warning")
        self.label.configure(text=text)
        self.show()

    def error(self, text):
        self.icon.set_icon("error")
        self.label.configure(text=text)
        self.show()
    
    def show(self, *_):
        self.wm_deiconify()
        # self.after(10000, self.hide)
    
    def hide(self, *_):
        self.withdraw()
    
    def clear(self, *_):
        self.label.configure(text="NO NEW NOTIFICATIONS")

    def _follow_root(self, event):
        self.master.update_idletasks()
        self.update_idletasks()

        x = self.master.winfo_rootx() + self.master.winfo_width() - self.winfo_width() + self.offset 
        y = self.master.winfo_rooty() + self.master.winfo_height() - self.winfo_height() - self.offset 
        self.geometry(f"+{x}+{y}")
