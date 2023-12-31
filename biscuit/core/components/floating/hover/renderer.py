from __future__ import annotations

import tkinter as tk
import typing

import mistune
from tkinterweb import HtmlFrame

from biscuit.core.components.utils import Frame, Scrollbar

if typing.TYPE_CHECKING:
    from . import Hover


class Renderer(HtmlFrame):
    def __init__(self, master: Hover, *args, **kwargs) -> None:
        super().__init__(master, messages_enabled=False, vertical_scrollbar=False, *args, **kwargs)
        self.base = master.base
        self.html.shrink(True)

    def render_markdown(self, rawmd):
        self.load_html(mistune.html(rawmd))
        t = self.base.theme
        self.add_css(f"""
            CODE, PRE {{
                font-family: {self.base.settings.font['family']};
                font-size: {self.base.settings.font['size']}pt;
                background-color: {t.border};
                padding: 2px;
            }}
            BODY {{
                margin-top: 0px;
                margin-bottom: 0px;
                padding: 0px;
                background-color: {t.secondary_background};
                color: {t.secondary_foreground};
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
            """)
        self.update_idletasks()
