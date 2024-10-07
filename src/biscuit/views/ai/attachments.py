from __future__ import annotations

import os
import tkinter as tk
import typing

from biscuit.common.icons import Icons
from biscuit.common.ui import Closable, Toplevel

if typing.TYPE_CHECKING:
    from .chat import Chat


class Attachments(Toplevel):
    """Attachments view for the AI assistant.

    The Attachments window is used to manage files attached to the AI chat.
    - The user can attach files to the AI assistant to get context based responses."""

    def __init__(self, master: Chat, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master: Chat = master
        self.config(bg=self.base.theme.biscuit, padx=1, pady=1)

        self.visible = False

        self.overrideredirect(True)
        self.attachments: list[str] = []
        self.withdraw()

        self.bind("<FocusOut>", self.hide)

    def show(self, *_) -> None:
        """Show the attachments view."""

        self.visible = True

        self.update_idletasks()
        self.update()

        self.minsize(self.master.attached_indicator.winfo_width(), 0)

        for widget in self.winfo_children():
            widget.destroy()

        for file in self.master.attachments:
            item = Closable(
                self,
                text=os.path.basename(file),
                icon=Icons.FILE,
                fg=self.base.theme.biscuit,
                hfg=self.base.theme.biscuit_light,
            )
            item.close_btn.set_callback(
                lambda *_, item=item, file=file: self.remove_attachment(file, item)
            )
            item.text_label.config(anchor=tk.W)
            item.pack(fill=tk.X, expand=True)

        self.configure_geometry()
        self.deiconify()
        self.focus_set()

    def configure_geometry(self):
        self.update_idletasks()
        self.master.update_idletasks()

        x = self.master.attached_indicator.winfo_rootx()
        y = (
            self.master.attached_indicator.winfo_rooty()
            - self.winfo_height()
            - self.master.entrybox.winfo_height()
        )

        self.geometry(f"+{int(x)}+{int(y)}")

    def remove_attachment(self, file: str, item: Closable) -> None:
        """Remove an attachment from the attachments list."""

        self.master.attachments.remove(file)
        if not self.master.attachments:
            self.hide()

        item.destroy()
        self.master.refresh_attachments()
        self.configure_geometry()

    def hide(self, *_) -> None:
        """Hide the attachments view."""

        self.withdraw()
        self.visible = False
