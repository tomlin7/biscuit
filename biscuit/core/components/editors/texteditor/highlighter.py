import os
import tkinter as tk

from pygments import lex
from pygments.lexers import get_lexer_by_name, get_lexer_for_filename


class Highlighter:
    def __init__(self, master, language=None, *args, **kwargs):
        self.master = master
        self.base = master.base

        self.text = master
        self.base = master.base
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
                if os.path.basename(master.path).endswith("txt"):
                    raise Exception()
                
                self.lexer = get_lexer_for_filename(os.path.basename(master.path), encoding=master.encoding)
                self.text.language = self.lexer.name
            except:
                self.lexer = None
                self.text.language = "Plain Text"
                self.base.notifications.info("No lexers are available for opened file type.")
                return
                
        self.tag_colors = self.base.theme.syntax
        self.setup_highlight_tags()
    
    def change_language(self, language):
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
                if os.path.basename(self.master.path).endswith("txt"):
                    raise Exception()
                
                self.lexer = get_lexer_for_filename(os.path.basename(self.master.path), encoding=self.master.encoding)
                self.text.language = self.lexer.name
            except:
                self.lexer = None
                self.text.language = "Plain Text"
                self.base.notifications.info("No lexers are available for opened file type.")
                return
            
    def setup_highlight_tags(self):
        for token, color in self.tag_colors.items():
            self.text.tag_configure(str(token), foreground=color)

    def highlight(self):
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
