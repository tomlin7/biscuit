import textwrap
import tkinter as tk

from ..icons import Icons
from .native import Frame, Label


class WrappingLabel(Label):
    """a type of Label that automatically adjusts the wrap to the size"""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.bind("<Configure>", lambda e: self.config(wraplength=self.winfo_width()))


class IconLabel(Frame):
    def __init__(
        self,
        master,
        text=None,
        icon: Icons = None,
        iconside=tk.LEFT,
        fg=None,
        font=None,
        padx=5,
        pady=1,
        expandicon=True,
        highlighted=False,
        iconsize=14,
        toggle=True,
        *args,
        **kwargs
    ) -> None:
        super().__init__(master, padx=padx, pady=pady, *args, **kwargs)
        self.bg, self.fg, self.hbg, self.hfg = (
            self.base.theme.utils.iconlabelbutton.values()
            if not highlighted
            else self.base.theme.utils.button.values()
        )
        self.fg = fg or self.fg
        self.config(bg=self.bg)
        self.text = text
        self.icon = icon
        self.codicon = self.icon

        self.toggle = toggle

        if icon:
            self.icon_label = tk.Label(
                self,
                text=self.codicon,
                anchor=tk.E,
                bg=self.bg,
                fg=self.fg,
                font=("codicon", iconsize),
            )
            self.icon_label.pack(side=iconside, fill=tk.BOTH, expand=expandicon)

        if text:
            self.text_label = tk.Label(
                self,
                text=self.text,
                anchor=tk.W,
                pady=2,
                bg=self.bg,
                fg=self.fg,
                font=font or self.base.settings.uifont,
            )
            self.text_label.pack(side=iconside, fill=tk.BOTH, expand=True)

        self.visible = False

    def toggle_icon(self) -> None:
        self.icon_label.config(text=self.codicon if not self.toggle else "    ")
        self.toggle = not self.toggle

    def change_text(self, text) -> None:
        self.text_label.config(text=text)

    def change_icon(self, icon) -> None:
        self.icon_label.config(text=icon)

    def set_pack_data(self, **kwargs) -> None:
        self.pack_data = kwargs

    def get_pack_data(self):
        return self.pack_data

    def show(self) -> None:
        if not self.visible:
            self.visible = True
            self.pack(**self.get_pack_data())

    def hide(self) -> None:
        if self.visible:
            self.visible = False
            self.pack_forget()


class TruncatedLabel(Frame):
    """Truncates long text and adds filler "..." at the end
    NOTE: Doesnt work currently"""

    def __init__(self, master, text, *args, **kwargs) -> None:
        super().__init__(master)
        self.text = text
        self.pack_propagate(False)

        self.label = Label(self, text=text, *args, **kwargs)
        self.label.pack(fill="both", expand=True)

        self.bind("<Configure>", self._wrap_text)

    def _wrap_text(self, event=None):
        width = self.winfo_width() * (len(self.text) / self.label.winfo_width())

        if width > 0:
            wrapped_text = textwrap.fill(self.text, width=width)

            if len(wrapped_text) > len(self.text):
                # Truncate the text and add "..." at the end
                truncated_text = textwrap.shorten(
                    wrapped_text, width - 3, placeholder="..."
                )
                self.label.configure(text=truncated_text)
            else:
                self.label.configure(text=wrapped_text)
