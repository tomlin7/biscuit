import tkinter as tk

from ..codicon import get_codicon
from .icons import IconButton
from .native import Frame


class Closable(Frame):
    """For implementing a list of closeable items.
    A varient of IconLabelButton that comes with a close icon
    on the right side of the button.
    """

    def __init__(
        self,
        master,
        text=None,
        icon=None,
        callback=lambda *_: None,
        closefn=lambda *_: None,
        iconside=tk.LEFT,
        padx=5,
        pady=1,
        fg=None,
        bg=None,
        hfg=None,
        hbg=None,
        *args,
        **kwargs
    ) -> None:
        super().__init__(master, padx=padx, pady=pady, *args, **kwargs)
        self.callback = callback
        self.closefn = closefn

        self.bg, self.fg, self.hbg, self.hfg = (
            self.base.theme.utils.iconlabelbutton.values()
        )
        if fg:
            self.fg = fg
        if bg:
            self.bg = bg
        if hfg:
            self.hfg = hfg
        if hbg:
            self.hbg = hbg

        self.config(bg=self.bg)
        self.text = text
        self.icon = icon

        self.icon_label = None
        self.text_label = None

        if icon:
            self.icon_label = tk.Label(
                self,
                text=get_codicon(self.icon),
                anchor=tk.CENTER,
                bg=self.bg,
                fg=self.fg,
                font=("codicon", 14),
            )
            self.icon_label.pack(side=iconside, fill=tk.BOTH)

        if text:
            self.text_label = tk.Label(
                self,
                text=self.text,
                anchor=tk.CENTER,
                pady=2,
                bg=self.bg,
                fg=self.fg,
                font=self.base.settings.uifont,
            )
            self.text_label.pack(side=iconside, fill=tk.BOTH, expand=True)

        self.close_btn = IconButton(self, "close", self.closefn)
        self.close_btn.config(bg=self.bg, fg=self.fg)
        self.close_btn.pack(side=tk.RIGHT, fill=tk.BOTH)

        self.config_bindings()
        self.visible = False

    def config_bindings(self) -> None:
        self.bind("<Enter>", self.on_enter)
        self.bind("<Leave>", self.on_leave)

        self.bind("<Button-1>", self.on_click)
        if self.text:
            self.text_label.bind("<Button-1>", self.on_click)
        if self.icon:
            self.icon_label.bind("<Button-1>", self.on_click)

    def on_enter(self, *_) -> None:
        self.config(bg=self.hbg)
        if self.text:
            self.text_label.config(bg=self.hbg, fg=self.hfg)
        if self.icon:
            self.icon_label.config(bg=self.hbg, fg=self.hfg)
        self.close_btn.config(bg=self.hbg, fg=self.hfg)

    def on_leave(self, *_) -> None:
        self.config(bg=self.bg)
        if self.text:
            self.text_label.config(bg=self.bg, fg=self.fg)
        if self.icon:
            self.icon_label.config(bg=self.bg, fg=self.fg)
        self.close_btn.config(bg=self.bg, fg=self.fg)

    def on_click(self, *_) -> None:
        self.callback()

    def change_text(self, text) -> None:
        """Change the text of the item"""

        self.text_label.config(text=text)

    def change_icon(self, icon) -> None:
        """Change the icon of the item"""

        self.icon_label.config(text=icon)

    def set_pack_data(self, **kwargs) -> None:
        self.pack_data = kwargs

    def get_pack_data(self):
        return self.pack_data

    def show(self) -> None:
        """Show the item"""

        if not self.visible:
            self.visible = True
            self.pack(**self.get_pack_data())

    def hide(self) -> None:
        """Hide the item"""

        if self.visible:
            self.visible = False
            self.pack_forget()
