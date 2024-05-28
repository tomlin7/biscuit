from __future__ import annotations

import tkinter as tk
import typing

import mistune
from tkinterweb import HtmlFrame

from src.biscuit.utils import Frame, Scrollbar

if typing.TYPE_CHECKING:
    ...


class Renderer(Frame):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)

        self.htmlframe = HtmlFrame(self, messages_enabled=False, vertical_scrollbar=False)
        self.scrollbar = Scrollbar(self, orient=tk.VERTICAL, command=self.htmlframe.yview, style="EditorScrollbar")
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
                font-family: {self.base.settings.font['family']};
                font-size: {self.base.settings.font['size']}pt;
                background-color: {t.border};
                padding: 2px;
            }}
            BODY {{
                background-color: {t.primary_background};
                color: {t.primary_foreground};
                font-family: {self.base.settings.font['family']};
                font-size: {self.base.settings.font['size']}pt;
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

        
    def write(self, content: str) -> None:
        self.content += content
        self.htmlframe.load_html(mistune.html(self.header + self.content + self.footer))
        self.htmlframe.add_css(self.css)
