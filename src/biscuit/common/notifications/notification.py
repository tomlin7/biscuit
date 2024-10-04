from __future__ import annotations

import tkinter as tk
import typing

from biscuit.common import Icons

from ..helpers import caller_class_name
from ..ui import Frame, Icon, IconButton, IconLabelButton, Label

if typing.TYPE_CHECKING:
    from .manager import Notifications


class Notification(Frame):
    """Notification class

    Holds the notification icon, text and close button"""

    def __init__(
        self,
        master: Notifications,
        icon: str,
        text: str,
        actions: list[tuple[str, typing.Callable[[None], None]]],
        fg: str,
        *args,
        **kwargs,
    ) -> None:
        """Create a notification

        Args:
            master: Parent widget
            icon (str): Icon name
            text (str): Notification text
            fg (str): Foreground color
            actions (list[tuple(str, Callable[[None], None])]): List of actions"""

        super().__init__(master, *args, **kwargs)
        self.master: Notifications = master
        self.config(**self.base.theme.notifications)

        top = Frame(self, **self.base.theme.utils.frame)
        top.pack(fill=tk.BOTH, expand=1)
        bottom = Frame(self, **self.base.theme.utils.frame)
        bottom.pack(fill=tk.BOTH)

        self.icon = Icon(top, icon, padx=5, **self.base.theme.utils.iconbutton)
        self.icon.config(fg=fg)
        self.icon.pack(side=tk.LEFT, fill=tk.BOTH)

        self.label = Label(
            top,
            text=text,
            anchor=tk.W,
            padx=10,
            pady=10,
            font=self.base.settings.uifont,
            **self.base.theme.utils.iconbutton,
        )
        self.label.pack(side=tk.LEFT, expand=1, fill=tk.BOTH, anchor=tk.W)

        close_button = IconButton(top, Icons.CLOSE, self.delete)
        close_button.pack(fill=tk.BOTH)

        self.source_label = Label(
            bottom,
            text=f"Source: {caller_class_name(3)}",
            anchor=tk.W,
            padx=10,
            pady=5,
            font=self.base.settings.uifont,
            **self.base.theme.notifications.source,
        )
        self.source_label.pack(side=tk.LEFT, fill=tk.BOTH)

        if actions:
            self.actions = Frame(bottom, **self.base.theme.notifications)
            self.actions.pack(side=tk.RIGHT, fill=tk.BOTH)

            for text, action in actions:
                btn = IconLabelButton(
                    self.actions, text, callback=action, highlighted=True
                )
                btn.pack(side=tk.LEFT, fill=tk.BOTH, padx=(0, 5), pady=(0, 5))

    def delete(self):
        """Delete the notification"""

        try:
            self.master.delete_notification(self)
        except Exception as e:
            self.base.logger.error(e)
