import tkinter as tk

from biscuit.common.ui import IconLabelButton


class Checkable(IconLabelButton):
    """A checkable menu item
    Inherits from IconLabelButton"""

    def __init__(
        self, master, text, command=lambda *_: ..., checked=False, *args, **kwargs
    ) -> None:
        """Create a checkable menu item

        Args:
            master: The parent widget
            text: The text to display on the menu item
            command: The command to run when the item is clicked
            checked: The initial checked state
            *args: Additional arguments to pass to the Icon
        """

        super().__init__(
            master,
            text,
            "check",
            command,
            expandicon=False,
            iconsize=10,
            icon_visible=checked,
            *args,
            **kwargs
        )

        self.command = command
        self.bg, self.fg, self.hbg, self.hfg = self.base.theme.menu.item.values()
        self.on_leave()

    def on_click(self, *_) -> None:
        self.master.hide()
        self.toggle_icon()
        return super().on_click(*_)
