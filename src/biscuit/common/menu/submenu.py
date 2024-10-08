import tkinter as tk

from biscuit.common.icons import Icons
from biscuit.common.ui import IconLabelButton


class SubMenuItem(IconLabelButton):
    """SubMenu"""

    def __init__(self, main, master, text, *args, **kwargs) -> None:
        """Create a submenu item

        Args:
            master: The parent widget
            text: The text to display on the menu item
        """

        super().__init__(
            master,
            text,
            Icons.CHEVRON_RIGHT,
            expandicon=False,
            iconsize=10,
            iconside=tk.RIGHT,
            *args,
            **kwargs
        )
        self.main = main
        self.text_label.config(padx=14)

        from .menu import Menu

        class SubMenu(Menu):
            def __init__(self, master, *args, **kwargs) -> None:
                super().__init__(master, *args, **kwargs)

            def get_coords(self) -> None:
                return (
                    self.master.winfo_rootx() + self.master.winfo_width(),
                    self.master.winfo_rooty(),
                )

        self.menu = SubMenu(self, text)

        self.bind("<Enter>", self.on_enter)
        self.bind("<Leave>", self.on_leave)

    def on_enter(self, e) -> None:
        self.main.hold_focus = True
        self.menu.show()
        super().on_enter(e)

    def on_leave(self, e=None) -> None:
        self.main.hold_focus = False

        # TODO: Keeping highlight on the submenuitem
        # following won't work because hide() is not called (somehow magically happens)

        # if self.menu.active:
        #     return

        super().on_leave(e)
        # self.menu.hide()

    def on_click(self, *_) -> None: ...
