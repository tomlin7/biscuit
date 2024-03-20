import tkinter as tk

from biscuit.core.components.editors.texteditor import TextEditor

from ..editor import BaseEditor
from .renderer import Renderer


class MDEditor(BaseEditor):
    def __init__(self, master, path, exists=False, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)
        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)
        self.path = path
        self.exists = exists
        self.editable = True
        self.preview_enabled = False

        self.__buttons__ = (('open-preview', self.toggle_preview),)

        self.editor = TextEditor(self, path, exists=exists)
        self.editor.grid(row=0, column=0, sticky=tk.NSEW, padx=(0, 1))

        self.renderer = Renderer(self, editor=self.editor)

        self.left = self.text = self.editor.text
        self.right  = self.renderer.text

        self.editor.scrollbar['command'] = self.on_scrollbar
        self.renderer.scrollbar['command'] = self.on_scrollbar
        self.left['yscrollcommand'] = self.on_textscroll
        #self.right['yscrollcommand'] = self.on_textscroll

        self.editor.bind("<<Change>>", self.on_change)
        self.edit_undo = self.editor.edit_undo
        self.editor_redo = self.editor.edit_redo

    def toggle_preview(self,*_):
        if self.preview_enabled:
            self.renderer.grid_forget()
        else:
            self.renderer.grid(row=0, column=1, sticky=tk.NSEW)
        self.preview_enabled = not self.preview_enabled

    def on_scrollbar(self, *args) -> None:
        self.left.yview(*args)
        self.editor.on_scroll()
        self.right.yview(*args)

    def on_textscroll(self, *args) -> None:
        self.editor.scrollbar.set(*args)
        self.renderer.scrollbar.set(*args)
        self.on_scrollbar('moveto', args[0])

    def on_change(self, *_):
        self.renderer.refresh()
