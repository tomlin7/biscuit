import tkinter as tk

from ...utils import Icon, IconButton, Label, Toplevel


class Notifications(Toplevel):
    """
    Floating notifications, shown on bottom right corner
    NOTE: Currently only supports showing one notification at a time
    """
    def __init__(self, base) -> None:
        super().__init__(base)
        self.config(bg=self.base.theme.border, padx=1, pady=1)
        self.active = False

        self.count = 0

        self.overrideredirect(True)

        self.xoffset = 5 * self.base.scale
        self.yoffset = 25 * self.base.scale
        
        self.minsize(width=round(300*self.base.scale), height=round(15*self.base.scale))

        self.icon = Icon(self, 'info', padx=5, **self.base.theme.notifications.text)
        self.icon.pack(side=tk.LEFT, fill=tk.BOTH)

        self.label = Label(self, text="NO NEW NOTIFICATIONS", anchor=tk.W, padx=10, **self.base.theme.notifications.text)
        self.label.pack(side=tk.LEFT, expand=1, fill=tk.BOTH)

        close_button = IconButton(self, "chevron-down", self.hide)
        close_button.pack(side=tk.RIGHT, fill=tk.BOTH)

        self.withdraw()

        self.base.register_onfocus(self.lift)
        self.base.register_onupdate(self._follow_root)
    
    def info(self, text) -> None:
        self.icon.set_icon("info")
        self.icon.config(fg=self.base.theme.biscuit)
        self.label.configure(text=text)
        self.count += 1
        self.show()
    
    def warning(self, text) -> None:
        self.icon.set_icon("warning")
        self.icon.config(fg="yellow")
        self.label.configure(text=text)
        self.count += 1
        self.show()
    
    def error(self, text) -> None:
        self.icon.set_icon("error")
        self.icon.config(fg="red")
        self.label.configure(text=text)
        self.count += 1
        self.show()
    
    def _follow_root(self) -> None:
        if not self.active:
            return
        
        self.update_idletasks()
        x = self.base.winfo_x() + self.base.winfo_width() - self.winfo_width() - self.xoffset 
        y = self.base.winfo_y() + self.base.winfo_height() - self.winfo_height() - self.yoffset 
        
        self.geometry(f"+{int(x)}+{int(y)}")
    
    def show(self, *_) -> None:
        self.active = True
        self._follow_root()
        self.deiconify()
        self.lift()
        self.base.statusbar.update_notifications()
    
    def hide(self, *_) -> None:
        self.active = False
        self.withdraw()
    
    def clear(self, *_) -> None:
        self.label.configure(text="NO NEW NOTIFICATIONS")
        self.count = 0
