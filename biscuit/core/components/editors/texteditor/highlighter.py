from __future__ import annotations

import os
import threading
import tkinter as tk
import typing

from pygments import lex
from pygments.lexers import get_lexer_by_name, get_lexer_for_filename

if typing.TYPE_CHECKING:
    from .text import Text

class Highlighter:
    def __init__(self, text: Text, language: str=None, *args, **kwargs) -> None:
        """Highlighter based on pygments lexers
        If language is not given, it will try to detect the language from the file extension.
        If the file extension is not recognized, it will default to plain text.

        Attributes
        ----------
        text : Text
            Text widget to highlight
        language : str, optional
            Language to highlight, by default None
        """
        self.text: Text = text
        self.base = text.base
        self.language = language
        
        if language:
            try:
                self.lexer = get_lexer_by_name(language)
                self.text.language = self.lexer.name
            except:
                self.lexer = None
                self.text.language = "Plain Text"
                self.base.notifications.info("Selected lexer is not available.")
                return
        else:
            try:
                if os.path.basename(text.path).endswith("txt"):
                    raise Exception()
                
                self.lexer = get_lexer_for_filename(os.path.basename(text.path), encoding=text.encoding)
                self.text.language = self.lexer.name
            except:
                self.lexer = None
                self.text.language = "Plain Text"
                self.base.notifications.info("No lexers are available for opened file type.")
                return
                
        self.tag_colors = self.base.theme.syntax
        self.setup_highlight_tags()
    
    def change_language(self, language: str) -> None:
        """Change the language of the highlighter
        If language is not given, it will try to detect the language from the file extension.
        If the file extension is not recognized, it will default to plain text.

        Parameters
        ----------
        language : str
            Language to highlight
        """
        if language:
            try:
                self.lexer = get_lexer_by_name(language)
                self.text.language = self.lexer.name
            except:
                self.lexer = None
                self.text.language = "Plain Text"
                self.base.notifications.info("Selected lexer is not available.")
                return
        else:
            try:
                if os.path.basename(self.text.path).endswith("txt"):
                    raise Exception()
                
                self.lexer = get_lexer_for_filename(os.path.basename(self.text.path), encoding=self.text.encoding)
                self.text.language = self.lexer.name
            except:
                self.lexer = None
                self.text.language = "Plain Text"
                self.base.notifications.info("No lexers are available for opened file type.")
                return
        
        threading.Thread(target=self.text.refresh, daemon=True).start()
        
    def setup_highlight_tags(self) -> None:
        "Setup the tags for highlighting"
        for token, color in self.tag_colors.items():
            self.text.tag_configure(str(token), foreground=color)

    def highlight(self) -> None:
        "Highlights the text content of attached Editor instance"
        if not self.lexer:
            return
        
        for token, _ in self.tag_colors.items():
            self.text.tag_remove(str(token), '1.0', tk.END)
            
        text = self.text.get_all_text()

        # NOTE:  Highlighting only visible area
        # total_lines = int(self.text.index('end-1c').split('.')[0])
        # start_line = int(self.text.yview()[0] * total_lines)
        # first_visible_index = f"{start_line}.0"
        # last_visible_index =f"{self.text.winfo_height()}.end"
        # for token, _ in self.tag_colors.items():
        #     self.text.tag_remove(str(token), first_visible_index, last_visible_index)
        # text = self.text.get(first_visible_index, last_visible_index)

        self.text.mark_set("range_start", '1.0')
        for token, content in lex(text, self.lexer):
            self.text.mark_set("range_end", f"range_start + {len(content)}c")
            self.text.tag_add(str(token), "range_start", "range_end")
            self.text.mark_set("range_start", "range_end")
            
            # DEBUG
            # print(f"{content} is recognized as a <{str(token)}>")
        # print("==================================")
