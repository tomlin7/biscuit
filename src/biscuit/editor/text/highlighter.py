from __future__ import annotations

import os
import tkinter as tk
import typing

from pygments import lex
from pygments.lexers import get_lexer_by_name, get_lexer_for_filename
from pygments.style import Style

if typing.TYPE_CHECKING:
    from biscuit import App

    from .text import Text


class BiscuitStyle(Style):
    name = "biscuit"

    def __init__(self, master: Highlighter) -> None:
        self.base = master.base
        self.styles = self.base.theme.syntax
        self.background_color = self.base.theme.editors.background


class Highlighter:
    """Syntax Highlighter

    This highlighter uses pygments to highlight the text content based on the lexer provided.
    The lexer can be provided explicitly or it can be detected from the file extension.
    If the file extension is not recognized, it will default to plain text.

    Supported languages and text formats: https://pygments.org/docs/lexers/
    """

    def __init__(self, text: Text, language: str = None, *args, **kwargs) -> None:
        """Highlighter based on pygments lexers

        If language is not given, it will try to detect the language from the file extension.
        If the file extension is not recognized, it will default to plain text.

        Args:
            text (Text): The text instance to be highlighted
            language (str, optional): Language to highlight. Defaults to None."""

        self.text: Text = text
        self.base: App = text.base
        self.language = language

        if language:
            try:
                self.lexer = get_lexer_by_name(language)
                self.text.language = self.lexer.name
                self.text.language_alias = self.lexer.aliases[0]
            except:
                self.lexer = None
                self.text.language = "Plain Text"
                self.base.notifications.info("Selected lexer is not available.")
        else:
            try:
                if os.path.basename(text.path).endswith("txt"):
                    raise Exception()

                self.lexer = get_lexer_for_filename(
                    os.path.basename(text.path), encoding=text.encoding
                )
                self.text.language = self.lexer.name
                self.text.language_alias = self.lexer.aliases[0]
            except:
                self.lexer = None
                self.text.language = "Plain Text"

        self.tag_colors = self.base.theme.syntax
        self.setup_highlight_tags()

    def detect_language(self) -> None:
        """Detect the language from the file extension and set the lexer
        Refreshes language attribute of the text instance."""

        try:
            if os.path.basename(self.text.path).endswith("txt"):
                raise Exception()

            self.lexer = get_lexer_for_filename(
                os.path.basename(self.text.path), encoding=self.text.encoding
            )
            self.text.language = self.lexer.name
            self.text.language_alias = self.lexer.aliases[0]
            self.highlight()
        except:
            self.lexer = None
            self.text.language = "Plain Text"

    def change_language(self, language: str) -> None:
        """Change the language of the highlighter
        If language is not given, it will try to detect the language from the file extension.
        If the file extension is not recognized, it will default to plain text.

        Args:
            language (str): Language to highlight. Defaults to None."""

        try:
            self.lexer = get_lexer_by_name(language)
        except:
            self.lexer = None
            self.text.language = "Plain Text"
            self.base.notifications.info("Selected lexer is not available.")
            return

        self.text.language = self.lexer.name
        self.text.language_alias = self.lexer.aliases[0]
        self.tag_colors = self.base.theme.syntax
        self.text.master.on_change()
        self.base.statusbar.on_open_file(self.text)

    def setup_highlight_tags(self) -> None:
        """Setup the tags for highlighting the text content"""

        for token, props in self.tag_colors.items():
            if isinstance(props, dict):
                if "font" in props and isinstance(props["font"], dict):
                    f = self.base.settings.font.copy()
                    f.config(**props["font"])
                    props["font"] = f

                self.text.tag_configure(str(token), **props)
            else:
                self.text.tag_configure(str(token), foreground=props)

    def clear(self) -> None:
        """Clears the highlighting of the text content"""

        for token, _ in self.tag_colors.items():
            self.text.tag_remove(str(token), "1.0", tk.END)

    def highlight(self) -> None:
        """Highlight the text content

        This method highlights the text content based on the lexer provided.

        TODO: As of now, it highlights the entire text content.
        It needs to be optimized to highlight only the visible area."""

        if not self.lexer or not self.tag_colors:
            return

        for token, _ in self.tag_colors.items():
            self.text.tag_remove(str(token), "1.0", tk.END)

        text = self.text.get_all_text()

        # NOTE:  Highlighting only visible area
        # total_lines = int(self.text.index('end-1c').split('.')[0])
        # start_line = int(self.text.yview()[0] * total_lines)
        # first_visible_index = f"{start_line}.0"
        # last_visible_index =f"{self.text.winfo_height()}.end"
        # for token, _ in self.tag_colors.items():
        #     self.text.tag_remove(str(token), first_visible_index, last_visible_index)
        # text = self.text.get(first_visible_index, last_visible_index)

        self.text.mark_set("range_start", "1.0")
        for token, content in lex(text, self.lexer):
            self.text.mark_set("range_end", f"range_start + {len(content)}c")
            self.text.tag_add(str(token), "range_start", "range_end")
            self.text.mark_set("range_start", "range_end")

            # DEBUG
            # print(f"{content} is recognized as a <{str(token)}>")
        # print("==================================")
