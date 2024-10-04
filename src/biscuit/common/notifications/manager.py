import tkinter as tk
from typing import Callable

from biscuit.common.icons import Icons

from ..ui import Frame, IconButton, Label, Toplevel
from .notification import Notification


class Notifications(Toplevel):
    """
    Floating notifications, shown on bottom right corner

    Attributes:
        active (bool): whether shown or not
        count (int): number of notifications
        notifications (list[Notification]): list of active notifications
        title (Label): title bar label
        xoffset (int): x offset
        yoffset (int): y offset

    Methods:
        info: create info notification
        warning: create warning notification
        error: create error notification
        show: show notification
        hide: hide notification
        clear: clear all notifications
        delete: delete notification
    """

    def __init__(self, base) -> None:
        super().__init__(base)
        self.config(bg=self.base.theme.border, padx=1, pady=1)
        self.active = False
        self.overrideredirect(True)

        self.minsize(
            width=round(300 * self.base.scale), height=round(15 * self.base.scale)
        )
        self.minsize(
            width=round(300 * self.base.scale), height=round(15 * self.base.scale)
        )
        self.withdraw()
        self.xoffset = 5 * self.base.scale
        self.yoffset = 30 * self.base.scale

        self.latest: Notification = None
        self.count = 0
        self.notifications: list[Notification] = []

        topbar = Frame(self, **self.base.theme.notifications)
        topbar.pack(side=tk.TOP, fill=tk.BOTH, expand=1)

        self.title = Label(
            topbar,
            text="NOTIFICATIONS",
            anchor=tk.W,
            font=self.base.settings.uifont,
            **self.base.theme.notifications.title,
        )
        self.title.pack(side=tk.LEFT, padx=10, fill=tk.BOTH, expand=1)

        close_button = IconButton(topbar, Icons.CLOSE, self.hide)
        close_button.config(**self.base.theme.notifications.title)
        close_button.pack(side=tk.RIGHT, fill=tk.BOTH, pady=(0, 1))

        self.base.bind("<FocusIn>", lambda *_: self.lift, add=True)
        self.base.bind("<Configure>", self._follow_root, add=True)
        self.lift()
        self.withdraw()

    def info(
        self, text: str, actions: list[tuple[str, Callable[[None], None]]] = None
    ) -> Notification:
        """Create an info notification

        Args:
            text (str): notification text"""

        instance = Notification(
            self, Icons.INFO, text=text, fg=self.base.theme.biscuit, actions=actions
        )
        instance.pack(side=tk.TOP, fill=tk.BOTH, expand=1, pady=(0, 1))
        self.count += 1
        self.show()
        self.update_idletasks()
        self._follow_root()

        self.notifications.append(instance)
        self.latest = instance
        return instance

    def warning(
        self, text: str, actions: list[tuple[str, Callable[[None], None]]] = None
    ) -> Notification:
        """Create a warning notification

        Args:
            text (str): notification text"""

        instance = Notification(
            self, Icons.WARNING, text=text, fg="yellow", actions=actions
        )
        instance.pack(side=tk.TOP, fill=tk.BOTH, expand=1, pady=(0, 1))
        self.count += 1
        self.show()
        self.update_idletasks()
        self._follow_root()

        self.notifications.append(instance)
        self.latest = instance
        return instance

    def error(
        self, text: str, actions: list[tuple[str, Callable[[None], None]]] = None
    ) -> Notification:
        """Create an error notification

        Args:
            text (str): notification text"""

        instance = Notification(self, Icons.ERROR, text=text, fg="red", actions=actions)
        instance.pack(side=tk.TOP, fill=tk.BOTH, expand=1, pady=(0, 1))
        self.count += 1
        self.show()
        self.update_idletasks()
        self._follow_root()

        self.notifications.append(instance)
        self.latest = instance
        return instance

    def notify(
        self,
        text: str,
        kind: int,
        actions: list[tuple[str, Callable[[None], None]]] = None,
    ) -> Notification:
        """Create a notification based on kind
        1: info
        2: warning
        3: error

        Args:
            text (str): notification text
            kind (int): notification kind
        """
        match kind:
            case 1:
                self.error(text, actions)
            case 2:
                self.warning(text, actions)
            case _:
                self.info(text, actions)

    def _follow_root(self, *_) -> None:
        """Follow root window position"""

        if not self.active:
            return

        try:
            x = (
                self.base.winfo_x()
                + self.base.winfo_width()
                - self.winfo_width()
                - self.xoffset
            )
            y = (
                self.base.winfo_y()
                + self.base.winfo_height()
                - self.winfo_height()
                - self.yoffset
            )

            self.geometry(f"+{int(x)}+{int(y)}")
        except tk.TclError:
            # root window is destroyed
            pass

    def toggle(self, *_) -> None:
        """Toggle notification visibility"""

        if self.active:
            self.hide()
        else:
            self.show()

    def show(self, *_) -> None:
        """Toggle notification visibility
        Also updates title based on count."""

        if self.count:
            self.title.config(text=f"NOTIFICATIONS ({self.count})")
        else:
            self.title.config(text="NO NEW NOTIFICATIONS")

        self.active = True
        self.deiconify()
        self._follow_root()
        self.lift()
        self.base.statusbar.update_notifications()

    def hide(self, *_) -> None:
        """Hide notifications"""

        self.active = False
        self.withdraw()

    def clear(self, *_) -> None:
        """Clear all notifications"""

        for i in self.notifications:
            i.delete()
        self.count = 0

    def delete_notification(self, notification: Notification) -> None:
        """Delete a notification

        Args:
            notification (Notification): notification to delete"""

        self.notifications.remove(notification)
        notification.destroy()
        self.count -= 1

        self.update_idletasks()
        self._follow_root()

        if not self.count:
            self.hide()

        self.base.statusbar.update_notifications()
