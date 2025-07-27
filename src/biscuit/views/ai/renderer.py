from __future__ import annotations

import tkinter as tk
import typing

import mistune
from mistune import InlineParser
from mistune.plugins.abbr import abbr
from mistune.plugins.def_list import def_list
from mistune.plugins.footnotes import footnotes
from mistune.plugins.formatting import strikethrough
from mistune.plugins.speedup import speedup
from mistune.plugins.table import table
from mistune.plugins.task_lists import task_lists
from mistune.plugins.url import url
from pygments import highlight
from pygments.formatters import html
from pygments.lexers import get_lexer_by_name
from pygments.style import Style
from tkinterweb import HtmlFrame

from biscuit.common.ui import Frame, Scrollbar

if typing.TYPE_CHECKING:
    from ...settings.config import Theme


class HighlightRenderer(mistune.HTMLRenderer):
    def __init__(self, style, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.style = style
        self.formatter = html.HtmlFormatter(style=self.style)

    def block_code(self, code, info=None):
        try:
            if info:
                lexer = get_lexer_by_name(info, stripall=True)
                return highlight(code, lexer, self.formatter)
        except Exception as e:
            print(e)

        return "<pre><code>" + mistune.escape(code) + "</code></pre>"


class BiscuitStyle(Style):
    def __init__(self, theme: Theme):
        super().__init__()
        self.theme = theme
        self.styles = self.theme.syntax

    def __iter__(self):
        for token, color in self.theme.syntax.items():
            if isinstance(color, dict):
                yield token, {
                    "color": color["foreground"][1:],
                    "bold": False,
                    "italic": False,
                    "underline": False,
                    "bgcolor": None,
                    "border": None,
                }
            else:
                yield token, {
                    "color": color[1:],
                    "bold": False,
                    "italic": False,
                    "underline": False,
                    "bgcolor": None,
                    "border": None,
                }


class Renderer(Frame):
    """Renderer for the AI assistant chat view.

    The Renderer is used to render the chat messages in the AI chat view.
    - The Renderer uses the HtmlFrame widget to display the chat messages.
    - The chat messages support markdown formatting."""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)
        self.style = BiscuitStyle(self.base.theme)

        self.renderer = HighlightRenderer(self.style, escape=False)
        self.formatter = self.renderer.formatter
        self.markdown = mistune.Markdown(
            renderer=self.renderer,
            inline=InlineParser(),
            plugins=[
                abbr,
                def_list,
                footnotes,
                strikethrough,
                speedup,
                table,
                task_lists,
                url,
            ],
        )
        self.htmlframe = HtmlFrame(
            self, messages_enabled=False, vertical_scrollbar=False,
            shrink=True
        )
        self.scrollbar = Scrollbar(
            self,
            orient=tk.VERTICAL,
            command=self.htmlframe.yview,
            style="EditorScrollbar",
        )

        self.sparkles = f"<h4 color={self.base.theme.biscuit}>✨ Bikkis</h4> "

        self.htmlframe.html.config(yscrollcommand=self.scrollbar.set)
        # self.htmlframe.html.shrink(True)

        self.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)
        self.htmlframe.grid(row=0, column=1, sticky=tk.NSEW)
        self.scrollbar.grid(row=0, column=3, sticky=tk.NS)

        self.header = "<html><head></head><body>"
        self.footer = "</body></html>"
        self.content = ""

        t = self.base.theme
        t = self.base.theme
        pygments_css = self.formatter.get_style_defs(".highlight")
        self.css = f"""
            {pygments_css}
            CODE, PRE {{
                font-family: {self.base.settings.font['family']};
                font-size: {self.base.settings.font['size']}pt;
                background-color: {t.border};
                padding: 2px;
            }}
            BODY {{
                background-color: {t.primary_background};
                color: {t.primary_foreground};
                font-family: {self.base.settings.uifont['family']};
                font-size: {self.base.settings.uifont['size']}pt;
            }}
            img {{
                max-width: 100%;
                height: auto;
            }}

            hr {{
                border: 0;
                border-top: 1px solid {t.border};
                max-width: 100%;
            }}
            li{{
                margin-left:1px;
            }}

            tr, th, td {{
                border: 1px solid {t.border};
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

    def write(self, content: str, clear=False) -> None:
        if clear:
            self.content = self.markdown(content)
        else:
            self.content += self.markdown(content)
        self.htmlframe.load_html(self.content)
        self.htmlframe.add_css(self.css)
