from __future__ import annotations

import sv_ttk
from .theme import Theme


class HighContrastDark(Theme):
    name = "High Contrast Dark"

    border = "#6FC3DF"
    disabled = "#7F7F7F"

    primary_background = "#000000"
    primary_foreground = "#FFFFFF"
    primary_background_highlight = "#1F1F1F"
    primary_foreground_highlight = "#FFFFFF"

    secondary_background = "#0A0A0A"
    secondary_foreground = "#FFFFFF"
    secondary_background_highlight = "#2A2A2A"
    secondary_foreground_highlight = "#FFFFFF"

    # High-contrast syntax tokens (WCAG AAA compliant)
    Keyword = "#569CD6"
    Name = "#4EC9B0"
    Function = "#DCDCAA"
    String = "#CE9178"
    Number = "#B5CEA8"
    Comment = {"foreground": "#7CA668", "font": {"slant": "italic"}}
    Punctuation = "#FFFFFF"

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        try:
            sv_ttk.use_dark_theme()
        except Exception:
            pass

        self.editors.linenumbers.number.foreground = "#FFFFFF"
        self.editors.linenumbers.number.highlightforeground = "#FFFF00"
        self.editors.linenumbers.breakpoint.background = "#FF0000"
        self.editors.linenumbers.breakpoint.highlightbackground = "#FF0000"


class HighContrastLight(Theme):
    name = "High Contrast Light"

    border = "#0F4A85"
    disabled = "#666666"

    primary_background = "#FFFFFF"
    primary_foreground = "#000000"
    primary_background_highlight = "#E5E5E5"
    primary_foreground_highlight = "#000000"

    secondary_background = "#F0F0F0"
    secondary_foreground = "#000000"
    secondary_background_highlight = "#DCDCDC"
    secondary_foreground_highlight = "#000000"

    # High-contrast light syntax tokens
    Keyword = "#0000FF"
    Name = "#267F99"
    Function = "#795E26"
    String = "#A31515"
    Number = "#098658"
    Comment = {"foreground": "#008000", "font": {"slant": "italic"}}
    Punctuation = "#000000"

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        try:
            sv_ttk.use_light_theme()
        except Exception:
            pass

        self.editors.linenumbers.number.foreground = "#000000"
        self.editors.linenumbers.number.highlightforeground = "#0000FF"
        self.editors.linenumbers.breakpoint.background = "#B00000"
        self.editors.linenumbers.breakpoint.highlightbackground = "#B00000"
