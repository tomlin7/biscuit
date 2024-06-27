from __future__ import annotations

import tkinter as tk
import typing

import mistune
from tkinterweb import HtmlFrame

from biscuit.common.ui import Frame, Scrollbar

if typing.TYPE_CHECKING:
    ...


class Renderer(Frame):
    """Renderer for the AI assistant chat view.

    The Renderer is used to render the chat messages in the AI chat view.
    - The Renderer uses the HtmlFrame widget to display the chat messages.
    - The chat messages support markdown formatting."""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)

        self.htmlframe = HtmlFrame(
            self, messages_enabled=False, vertical_scrollbar=False
        )
        self.scrollbar = Scrollbar(
            self,
            orient=tk.VERTICAL,
            command=self.htmlframe.yview,
            style="EditorScrollbar",
        )

        self.sparkles = f"<h4 color={self.base.theme.biscuit}>✨ Bikkis</h4> "

        self.htmlframe.html.config(yscrollcommand=self.scrollbar.set)
        self.htmlframe.html.shrink(True)

        self.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)
        self.htmlframe.grid(row=0, column=1, sticky=tk.NSEW)
        self.scrollbar.grid(row=0, column=3, sticky=tk.NS)

        self.header = "<html><head></head><body>"
        self.footer = "</body></html>"
        self.content = ""

        t = self.base.theme
        self.css = f"""
            CODE, PRE {{
                font-family: {self.base.settings.uifont['family']};
                font-size: {self.base.settings.uifont['size']}pt;
                background-color: {t.border};
                padding: 2px;
            }}
            BODY {{
                background-color: {t.primary_background};
                color: {t.primary_foreground};
                font-family: {self.base.settings.uifont['family']};
                font-size: {self.base.settings.uifont['size']}pt;
            }}
            :link    {{ color: {t.biscuit}; }}
            :visited {{ color: {t.biscuit_dark}; }}
            INPUT, TEXTAREA, SELECT, BUTTON {{ 
                background-color: {t.secondary_background};
                color: {t.secondary_foreground_highlight};
            }}
            INPUT[type="submit"],INPUT[type="button"], INPUT[type="reset"], BUTTON {{
                background-color: {t.primary_background};
                color: {t.primary_foreground};
                color: tcl(::tkhtml::if_disabled {t.primary_background}{t.primary_foreground_highlight});
            }}
            """

    def write(self, content: str, sparkles: bool = False) -> None:
        if sparkles:
            self.content += self.sparkles
        self.content += mistune.html(content)
        self.htmlframe.load_html(self.content)
        self.htmlframe.add_css(self.css)
