from __future__ import annotations

import typing

import mistune
from tkinterweb import HtmlFrame

if typing.TYPE_CHECKING:
    from . import Hover


class HoverRenderer(HtmlFrame):
    def __init__(self, master: Hover, *args, **kwargs) -> None:
        super().__init__(
            master, messages_enabled=False, vertical_scrollbar=False, *args, **kwargs
        )
        self.base = master.base
        self.html.shrink(True)

    def render_markdown(self, rawmd):
        self.load_html(mistune.html(rawmd))
        t = self.base.theme
        self.add_css(
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
        self.update_idletasks()
