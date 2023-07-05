import tkinter as tk

from ...utils import IconButton, Toplevel, Label, Icon


class Notifications(Toplevel):
    """
    Floating notifications, shown on bottom right corner
    NOTE: Currently only supports showing one notification at a time
    """
    def __init__(self, base):
        super().__init__(base)
        self.config(bg=self.base.theme.border, padx=1, pady=1)
        self.active = False

        self.overrideredirect(True)

        self.offset = 10
        self.minsize(width=400, height=20)

        self.icon = Icon(self, 'info', padx=5, **self.base.theme.notifications.text)
        self.icon.pack(side=tk.LEFT, fill=tk.BOTH)

        self.label = Label(self, text="NO NEW NOTIFICATIONS", anchor=tk.W, padx=10, **self.base.theme.notifications.text)
        self.label.pack(side=tk.LEFT, expand=1, fill=tk.BOTH)

        close_button = IconButton(self, "chevron-down", self.hide)
        close_button.pack(side=tk.RIGHT, fill=tk.BOTH)

        self.withdraw()
        self.base.register_onupdate(self._follow_root)
    
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
    
    def _follow_root(self, *_):
        if not self.active:
            return
        
        self.update_idletasks()
        self.lift()
        x = self.base.winfo_x() + self.base.winfo_width() - self.winfo_width() - self.offset 
        y = self.base.winfo_y() + self.base.winfo_height() - self.winfo_height() - self.offset 
        self.geometry(f"+{x}+{y}")
    
    def show(self, *_):
        self.active = True
        self._follow_root()
        self.deiconify()
    
    def hide(self, *_):
        self.active = False
        self.withdraw()
    
    def clear(self, *_):
        self.label.configure(text="NO NEW NOTIFICATIONS")
