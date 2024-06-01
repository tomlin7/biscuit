from __future__ import annotations

import tkinter as tk
import typing

from tkinterweb import HtmlFrame

from src.biscuit.utils import Frame, Scrollbar

if typing.TYPE_CHECKING:
    from ..text import TextEditor


class HTMLRenderer(Frame):
    def __init__(self, master, editor: TextEditor, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.editor = editor
        self.config(bg=self.base.theme.border)

        self.text = HtmlFrame(self, messages_enabled=False, vertical_scrollbar=False)
        self.scrollbar = Scrollbar(
            self, orient=tk.VERTICAL, command=self.text.yview, style="EditorScrollbar"
        )

        self.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)
        self.text.grid(row=0, column=1, sticky=tk.NSEW)
        self.scrollbar.grid(row=0, column=3, sticky=tk.NS)

    def refresh(self, *_):
        htmlcontent = self.editor.text.get_all_text()
        if "<title>" in htmlcontent and "</title>" not in htmlcontent:
            return

        self.text.load_html(htmlcontent)
        t = self.base.theme
        self.text.add_css(
            f"""
            CODE, PRE {{
                font-family: {self.base.settings.font['family']};
                font-size: {self.base.settings.font['size']}pt;
                background-color: {t.border};
                padding: 2px;
            }}
            BODY {{
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
            """
        )
