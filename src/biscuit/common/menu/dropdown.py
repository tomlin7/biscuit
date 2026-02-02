import tkinter as tk

from ..icons import Icons
from ..ui.icon import IconButton
from ..ui.native import Frame
from .menu import Menu


class _DropdownMenu(Menu):
    def get_coords(self, e) -> tuple:
        return (
            self.master.winfo_rootx(),
            self.master.winfo_rooty() + self.master.winfo_height(),
        )

class _DropdownMenu2(Menu):
    def get_coords(self, e) -> tuple:
        self.update_idletasks()
        return (
            self.master.winfo_rootx(),
            self.master.winfo_rooty() - self.winfo_height(),
        )


class Dropdown(Frame):
    """For implementing a dropdown menu."""

    def __init__(
        self,
        master,
        selected="",
        items=[],
        icon: Icons = "",
        callback=lambda *_: None,
        iconside=tk.LEFT,
        padx=5,
        pady=1,
        fg="",
        bg="",
        hfg="",
        hbg="",
        iconfg="",
        iconbg="",
        iconhfg="",
        iconhbg="",
        empty_message="No items",
        open_upwards=False,
        *args,
        **kwargs
    ) -> None:
        super().__init__(master, padx=padx, pady=pady, *args, **kwargs)
        self.callback = callback
        self.empty_message = empty_message

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

        self.iconfg = iconfg or self.fg
        self.iconbg = iconbg or self.bg
        self.iconhfg = iconhfg or self.hfg
        self.iconhbg = iconhbg or self.hbg

        self.config(bg=self.bg)
        self.text = selected or empty_message
        self.icon = icon

        self.icon_label = None
        self.text_label = None

        self.selected = None
        self.menu = _DropdownMenu(self) if not open_upwards else _DropdownMenu2(self)
        self.set_items(items)

        if icon:
            self.icon_label = tk.Label(
                self,
                text=self.icon,
                anchor=tk.CENTER,
                bg=self.iconbg,
                fg=self.iconfg,
                font=("codicon", 12),
            )
            self.icon_label.pack(side=iconside, fill=tk.BOTH)

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

        self.dropdown_btn = IconButton(self, Icons.CHEVRON_DOWN, self.menu.show)
        self.dropdown_btn.config(bg=self.bg, fg=self.fg)
        self.dropdown_btn.pack(side=tk.RIGHT, fill=tk.BOTH)

        self.config_bindings()
        self.visible = False

    def add_command(self, text) -> None:
        """Add a command to the dropdown menu"""

        self.menu.add_command(text, lambda text=text: self.choose(text))

    def set_items(self, items: list[str]) -> None:
        self.menu.clear()
        if not items:
            self.add_command(self.empty_message)
        else:
            for i in items:
                self.add_command(i)

    def config_bindings(self) -> None:
        self.bind("<Enter>", self.on_enter)
        self.bind("<Leave>", self.on_leave)

        self.bind("<Button-1>", self.menu.show)
        if self.text:
            self.text_label.bind("<Button-1>", self.menu.show)
        if self.icon:
            self.icon_label.bind("<Button-1>", self.menu.show)

    def on_enter(self, *_) -> None:
        self.config(bg=self.hbg)
        if self.text:
            self.text_label.config(bg=self.hbg, fg=self.hfg)
        if self.icon:
            self.icon_label.config(bg=self.iconhbg, fg=self.iconhfg)
        self.dropdown_btn.config(bg=self.hbg, fg=self.hfg)

    def on_leave(self, *_) -> None:
        self.config(bg=self.bg)
        if self.text:
            self.text_label.config(bg=self.bg, fg=self.fg)
        if self.icon:
            self.icon_label.config(bg=self.iconbg, fg=self.iconfg)
        self.dropdown_btn.config(bg=self.bg, fg=self.fg)

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

    def choose(self, text) -> None:
        """Choose an item from the dropdown menu"""

        self.selected = text
        self.text_label.config(text=text)
        self.callback(text)

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
