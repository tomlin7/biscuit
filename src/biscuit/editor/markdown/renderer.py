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
    from ..text import TextEditor


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

    # def emoji(self, text):
    #     return "<emoji>%s</emoji>" % text


# class BiscuitInlineParser(InlineParser):
#     def __init__(self, *args, **kwargs) -> None:
#         super().__init__(*args, **kwargs)
#         self.enable_emoji = True

#     def output_emoji(self, m):
#         if self.enable_emoji:
#             return self.renderer.emoji(m.group(0))
#         return m.group(0)


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


class MDRenderer(Frame):
    def __init__(self, master, editor: TextEditor, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.editor = editor
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
        self.text = HtmlFrame(self, messages_enabled=False, vertical_scrollbar=False)
        self.scrollbar = Scrollbar(
            self, orient=tk.VERTICAL, command=self.text.yview, style="EditorScrollbar"
        )

        self.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)
        self.text.grid(row=0, column=1, sticky=tk.NSEW)
        self.scrollbar.grid(row=0, column=3, sticky=tk.NS)
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
                background-color: {t.secondary_background};
                color: {t.secondary_foreground};
                align-items: left;
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

    def refresh(self, *_):
        rawmd = self.editor.text.get_all_text()
        self.text.load_html(self.markdown(rawmd))
        self.text.add_css(self.css)
