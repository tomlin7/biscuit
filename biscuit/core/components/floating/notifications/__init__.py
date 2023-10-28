import tkinter as tk

from ...utils import Frame, IconButton, Label, Toplevel
from .notification import Notification


class Notifications(Toplevel):
    """
    Floating notifications, shown on bottom right corner
    NOTE: Currently only supports showing one notification at a time
    """
    def __init__(self, base) -> None:
        super().__init__(base)
        self.config(bg=self.base.theme.border, padx=1, pady=1)
        self.active = False
        self.overrideredirect(True)

        self.minsize(width=round(300*self.base.scale), height=round(15*self.base.scale))
        self.minsize(width=round(300*self.base.scale), height=round(15*self.base.scale))
        self.withdraw()
        self.xoffset = 5 * self.base.scale
        self.yoffset = 30 * self.base.scale

        self.count = 0
        self.notifications = []

        topbar = Frame(self, **self.base.theme.notifications)
        topbar.pack(side=tk.TOP, fill=tk.BOTH, expand=1)

        self.title = Label(topbar, text="NOTIFICATIONS", anchor=tk.W, **self.base.theme.notifications.title)
        self.title.pack(side=tk.LEFT, padx=10, fill=tk.BOTH, expand=1)

        close_button = IconButton(topbar, "chevron-down", self.hide)
        close_button.config(**self.base.theme.notifications.title)
        close_button.pack(side=tk.RIGHT, fill=tk.BOTH)

        self.base.register_onfocus(self.lift)
        self.base.register_onupdate(self.follow_root)

    def info(self, text) -> None:
        instance = Notification(self, "info", text=text, fg=self.base.theme.biscuit)
        instance.pack(side=tk.TOP, fill=tk.BOTH, expand=1)
        self.count += 1
        self.show()
        self.notifications.append(instance)

    def warning(self, text) -> None:
        instance = Notification(self, "warning", text=text, fg="yellow")
        instance.pack(side=tk.TOP, fill=tk.BOTH, expand=1)
        self.count += 1
        self.show()
        self.notifications.append(instance)

    def error(self, text) -> None:
        instance = Notification(self, "error", text=text, fg="red")
        instance.pack(side=tk.TOP, fill=tk.BOTH, expand=1)
        self.count += 1
        self.show()
        self.notifications.append(instance)

    def follow_root(self) -> None:
        if not self.active:
            return

        self.update_idletasks()
        x = self.base.winfo_x() + self.base.winfo_width() - self.winfo_width() - self.xoffset 
        y = self.base.winfo_y() + self.base.winfo_height() - self.winfo_height() - self.yoffset 

        self.geometry(f"+{int(x)}+{int(y)}")

    def show(self, *_) -> None:
        if self.count:
            self.title.config(text=f"NOTIFICATIONS ({self.count})")
        else:
            self.title.config(text="NO NEW NOTIFICATIONS")

        self.active = True
        self.deiconify()
        self.follow_root()
        self.lift()
        self.base.statusbar.update_notifications()

    def hide(self, *_) -> None:
        self.active = False
        self.withdraw()

    def clear(self, *_) -> None:
        for i in self.notifications:
            i.delete()
        self.count = 0

    def delete(self, notification) -> None:
        self.notifications.remove(notification)
        self.count -= 1
        notification.destroy()
        if not self.count:
            self.hide()
        else:
            self.show()
        self.base.statusbar.update_notifications()
