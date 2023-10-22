import re
import tkinter as tk
from typing import List, Tuple

from biscuit.core.components.utils import Frame, Scrollbar, Text

from ..texteditor import TextEditor


class Renderer(Frame):
    def __init__(self, master, editor: TextEditor, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.editor = editor
        font_family = "Calibri"
        font_size = self.editor.font.cget("size")
        self.config(bg=self.base.theme.border)

        self.text = Text(self, font=(font_family, font_size), padx=10, pady=5)
        self.text.configure(wrap=tk.NONE, relief=tk.FLAT, highlightthickness=0, bd=0, **self.base.theme.editors.text)
        self.scrollbar = Scrollbar(self, orient=tk.VERTICAL, command=self.text.yview, style="EditorScrollbar")
        
        self.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)
        self.text.grid(row=0, column=1, sticky=tk.NSEW)
        self.scrollbar.grid(row=0, column=3, sticky=tk.NS)

        h1 = int(font_size * 2)
        h2 = int(font_size * 1.5)
        h3 = int(font_size * 1.25)

        # raw markdown -> rendered 
        # (regex, replacement, tag)
        self.substitutes: List[Tuple[str, str, str]] = [
            (r'(^#{1} (.*))', r'\2', 'H1'),  # Header 1
            (r'(^#{2} (.*))', r'\2', 'H2'),  # Header 2
            (r'(^#{3} (.*))', r'\2', 'H3'),  # Header 3
            (r'(\*\*(.*?)\*\*)', r'\2', 'Bold'),  # **Bold**
            (r'(\*(.*?)\*)', r'\2', 'Italic'),  # *Italic*
            (r'(__(.*?)__)', 'Underline', r'\2'),  # __Underline__
            (r'(~~(.*?)~~)', 'Strikethrough', r'\2'),  # ~~Strikethrough~~
            (r'(`(.*?)`)', 'Code', r'\2'),  # `Code`
            (r'(\[(.*?)\]\((.*?)\))', 'Link', r'\2'),  # [Link](URL)
            (r'(!\[(.*?)\]\((.*?)\))', 'Image', r'\2'),  # ![Image](URL)
        ]

        # self.text.tag_configure('H1', font=f'{font_family} {h1}')
        # self.text.tag_configure('H2', font=f'{font_family} {h2}')
        # self.text.tag_configure('H3', font=f'{font_family} {h3}')
        # self.text.tag_configure('Bold', font=f'{font_family} {font_size} bold')
        # self.text.tag_configure('Italic', font=f'{font_family} {font_size} italic')
        # self.text.tag_configure('Underline', font=f'{font_family} {font_size} underline')
        # self.text.tag_configure('Strikethrough', font=f'{font_family} {font_size} overstrike')
        # self.text.tag_configure('Code', font=f'{font_family} {font_size} bold', foreground='grey')
        # self.text.tag_configure('Link', font=f'{font_family} {font_size} underline', foreground='blue')
        # self.text.tag_configure('Image', font=f'{font_family} {font_size} underline', foreground='blue')

    def refresh(self, *_):
        self.text.configure(state=tk.NORMAL)
        self.text.delete(1.0, tk.END)
        
        raw = self.editor.text.get_all_text()
        for regex, repl, _ in self.substitutes:
            try:
                raw = re.sub(regex, repl, raw, flags=re.MULTILINE)
            except re.error as e:
                print(regex, repl, raw)
                continue

        self.text.insert(tk.END, raw)
        self.text.configure(state=tk.DISABLED)
