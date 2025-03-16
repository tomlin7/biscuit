from __future__ import annotations

import webbrowser

from .labels import WrappingLabel


class LinkLabel(WrappingLabel):
    """Label that acts as a link"""

    def __init__(
        self, master, text: str, command=lambda _: None, *args, **kwargs
    ) -> None:
        super().__init__(master, text=text, *args, **kwargs)
        self.bg, self.fg, self.hbg, self.hfg = self.base.theme.utils.linklabel.values()

        # self.underlined = font.Font(self, self.base.settings.uifont)
        # self.underlined.configure(underline=True)

        self.config(
            font=self.base.settings.uifont,
            cursor="hand2",
            bg=self.bg,
            fg=self.fg,
        )
        self.bind("<Enter>", self.on_enter)
        self.bind("<Leave>", self.on_leave)
        self.set_command(command)

    def on_enter(self, _) -> None:
        self.config(fg=self.hfg)

    def on_leave(self, _) -> None:
        self.config(fg=self.fg)

    def set_command(self, command) -> None:
        self.bind("<Button-1>", command)

    def pack(self, *args, **kwargs) -> LinkLabel:
        super().pack(*args, **kwargs)
        return self


class WebLinkLabel(LinkLabel):
    """LinkLabel that opens a web link"""

    def __init__(self, master, text, link, *args, **kwargs) -> None:
        super().__init__(master, text=text, *args, **kwargs)
        self.link = link
        self.set_command(self.open_link)

    def open_link(self, *_) -> None:
        webbrowser.open(self.link)
