import tkinter as tk

from biscuit.common.icons import Icons
from biscuit.common.ui.bubble import Bubble
from biscuit.common.ui.icon import IconButton


class NotificationBubble(Bubble):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)

    def get_pos(self, *_):
        return (
            f"+{self.master.winfo_rootx() + (self.master.winfo_width() - self.winfo_width()) // 2}"
            + f"+{self.master.winfo_rooty() + self.master.winfo_height() - 2}"
        )


class Notifications(IconButton):
    """Notification

    - Notification indicator
    - Shows the number of notifications
    """

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(
            master, Icons.BELL, hfg_only=True, padx=10, pady=8, *args, **kwargs
        )

        self.base.notifications.set_button(self)
        self.event = self.base.notifications.show

        self.bubble = NotificationBubble(self, "No notifications")
        self.bind("<Enter>", self.bubble.show)
        self.bind("<Leave>", self.bubble.hide)
