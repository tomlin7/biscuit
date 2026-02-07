from __future__ import annotations

import typing

from .ts_highlighter import TreeSitterHighlighter

if typing.TYPE_CHECKING:
    from biscuit import App

    from .text import Text


class Highlighter:
    """Syntax Highlighter — Tree-sitter backend.

    Delegates to TreeSitterHighlighter for incremental, AST-based highlighting.
    The original Pygments implementation is preserved below (commented out).
    """

    def __init__(self, text: Text, language: str = None, *args, **kwargs) -> None:
        self.text: Text = text
        self.base: App = text.base

        self.ts = TreeSitterHighlighter(text, language)

        # Set language info for statusbar display
        self.text.language = self.ts.get_display_name()
        self.text.language_alias = self.ts.get_language_alias()

    def detect_language(self) -> None:
        """Re-detect language from the file extension."""
        self.ts.detect_language()
        self.text.language = self.ts.get_display_name()
        self.text.language_alias = self.ts.get_language_alias()

    def change_language(self, language: str) -> None:
        """Change the highlighting language."""
        self.ts.change_language(language)
        self.text.language = self.ts.get_display_name()
        self.text.language_alias = self.ts.get_language_alias()
        self.text.master.on_change()
        self.base.statusbar.on_open_file(self.text)

    def setup_highlight_tags(self) -> None:
        """Setup Tkinter text tags for highlighting."""
        self.ts.setup_highlight_tags()

    def clear(self) -> None:
        """Clear all highlighting."""
        self.ts.clear()

    def highlight(self) -> None:
        """Full highlight (parse entire file)."""
        self.ts.highlight()

    def incremental_highlight(self, edit_info: dict) -> None:
        """Incremental highlight after an edit."""
        self.ts.incremental_highlight(edit_info)

    def batch_incremental_highlight(self, edits: list[dict]) -> None:
        """Process multiple edits at once for better performance."""
        self.ts.batch_incremental_highlight(edits)


# =============================================================================
# ORIGINAL PYGMENTS IMPLEMENTATION (disabled — kept for reference)
# =============================================================================
#
# import os
# import tkinter as tk
#
# from pygments import lex
# from pygments.lexers import get_lexer_by_name, get_lexer_for_filename
# from pygments.style import Style
#
#
# class BiscuitStyle(Style):
#     name = "biscuit"
#
#     def __init__(self, master: Highlighter) -> None:
#         self.base = master.base
#         self.styles = self.base.theme.syntax
#         self.background_color = self.base.theme.editors.background
#
#
# class Highlighter:
#     """Syntax Highlighter
#
#     This highlighter uses pygments to highlight the text content based on
#     the lexer provided. The lexer can be provided explicitly or it can be
#     detected from the file extension. If the file extension is not
#     recognized, it will default to plain text.
#
#     Supported languages and text formats: https://pygments.org/docs/lexers/
#     """
#
#     def __init__(self, text: Text, language: str = None, *args, **kwargs):
#         self.text: Text = text
#         self.base: App = text.base
#         self.language = language
#
#         if language:
#             try:
#                 self.lexer = get_lexer_by_name(language)
#                 self.text.language = self.lexer.name
#                 self.text.language_alias = self.lexer.aliases[0]
#             except:
#                 self.lexer = None
#                 self.text.language = "Plain Text"
#                 self.text.language_alias = "text"
#                 self.base.notifications.info(
#                     "Selected lexer is not available."
#                 )
#         else:
#             try:
#                 if os.path.basename(text.path).endswith("txt"):
#                     raise Exception()
#
#                 self.lexer = get_lexer_for_filename(
#                     os.path.basename(text.path), encoding=text.encoding
#                 )
#                 self.text.language = self.lexer.name
#                 self.text.language_alias = self.lexer.aliases[0]
#             except:
#                 self.lexer = None
#                 self.text.language = "Plain Text"
#                 self.text.language_alias = "text"
#
#         self.tag_colors = self.base.theme.syntax
#         self.setup_highlight_tags()
#
#     def detect_language(self) -> None:
#         try:
#             if os.path.basename(self.text.path).endswith("txt"):
#                 raise Exception()
#
#             self.lexer = get_lexer_for_filename(
#                 os.path.basename(self.text.path), encoding=self.text.encoding
#             )
#             self.text.language = self.lexer.name
#             self.text.language_alias = self.lexer.aliases[0]
#             self.highlight()
#         except:
#             self.lexer = None
#             self.text.language = "Plain Text"
#             self.text.language_alias = "text"
#
#     def change_language(self, language: str) -> None:
#         try:
#             self.lexer = get_lexer_by_name(language)
#         except:
#             self.lexer = None
#             self.text.language = "Plain Text"
#             self.text.language_alias = "text"
#             self.base.notifications.info(
#                 "Selected lexer is not available."
#             )
#             return
#
#         self.text.language = self.lexer.name
#         self.text.language_alias = self.lexer.aliases[0]
#         self.tag_colors = self.base.theme.syntax
#         self.text.master.on_change()
#         self.base.statusbar.on_open_file(self.text)
#
#     def setup_highlight_tags(self) -> None:
#         for token, props in self.tag_colors.items():
#             if isinstance(props, dict):
#                 if "font" in props and isinstance(props["font"], dict):
#                     f = self.base.settings.font.copy()
#                     f.config(**props["font"])
#                     props["font"] = f
#
#                 self.text.tag_configure(str(token), **props)
#             else:
#                 self.text.tag_configure(str(token), foreground=props)
#
#     def clear(self) -> None:
#         for token, _ in self.tag_colors.items():
#             self.text.tag_remove(str(token), "1.0", tk.END)
#
#     def highlight(self) -> None:
#         if not self.lexer or not self.tag_colors:
#             return
#
#         for token, _ in self.tag_colors.items():
#             self.text.tag_remove(str(token), "1.0", tk.END)
#
#         text = self.text.get_all_text()
#
#         self.text.mark_set("range_start", "1.0")
#         for token, content in lex(text, self.lexer):
#             self.text.mark_set(
#                 "range_end", f"range_start + {len(content)}c"
#             )
#             self.text.tag_add(str(token), "range_start", "range_end")
#             self.text.mark_set("range_start", "range_end")
