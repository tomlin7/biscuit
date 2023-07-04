import tkinter as tk

from ...utils import IconButton, Toplevel, Label


class Notifications(Toplevel):
    """
    Floating notifications, shown on bottom right corner
    NOTE: Currently only supports showing one notification at a time
    """
    def __init__(self, base):
        super().__init__(base)
        self.config(bg=self.base.theme.border, padx=1, pady=1)
        self.overrideredirect(True)

        self.offset = 10
        self.minsize(width=400, height=1)

        self.icon = IconButton(self, 'info', padx=5)
        self.icon.pack(side=tk.LEFT, fill=tk.BOTH)

        self.label = Label(self, text="NO NEW NOTIFICATIONS", anchor=tk.W, padx=10, **self.base.theme.notifications.text)
        self.label.pack(side=tk.LEFT, expand=1, fill=tk.BOTH)

        close_button = IconButton(self, "chevron-down")
        close_button.pack(side=tk.RIGHT, fill=tk.BOTH)
        close_button.bind('<Button-1>', self.hide)

        self.bind("<FocusOut>", self.hide)
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
        #NOTE binding to <Map> and <Configure> should allow following the root when its moved
        self.wm_deiconify()
        self.update_idletasks()
        x = self.master.winfo_x() + self.master.winfo_width() - self.winfo_width() - self.offset 
        y = self.master.winfo_y() + self.master.winfo_height() - self.winfo_height() - self.offset 
        self.geometry(f"+{x}+{y}")
    
    def hide(self, *_):
        self.withdraw()
    
    def clear(self, *_):
        self.label.configure(text="NO NEW NOTIFICATIONS")