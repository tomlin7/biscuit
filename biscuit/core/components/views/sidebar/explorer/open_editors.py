import os
import platform
import shutil
import subprocess
import threading
import tkinter as tk

import pyperclip

from biscuit.core.components.floating.palette.actionset import ActionSet
from biscuit.core.components.utils import Tree

from ..item import SidebarViewItem


class OpenEditors(SidebarViewItem):
    def __init__(self, master, startpath=None, itembar=True, *args, **kwargs) -> None:
        self.title = 'Open Editors'
        self.__buttons__ = (('new-file', lambda: self.base.palette.show('newfile:')),)
        super().__init__(master, itembar, *args, **kwargs)

        self.tree = Tree(self.content, startpath, singleclick=self.openfile, *args, **kwargs)
        self.tree.bind("<Configure>", self.adjust_frame_size)
        self.tree.grid(row=0, column=0, sticky=tk.NSEW)
        self.tree.bind("<<Open>>", self.openfile)

        self.path = startpath
    
    def adjust_frame_size(self, *_):
        if items := self.tree.get_children():
            frame_height = len(items) * 25 + 5
        else:
            frame_height = 1
        self.tree.config(height=frame_height)
        self.update()

    def add_item(self, editor):
        self.tree.insert('', 'end', text=editor.filename, values=(editor.path, 'file'))
        self.adjust_frame_size()
    
    def remove_item(self, editor):
        for child in self.tree.get_children():
            if self.tree.item_fullpath(child) == editor.path:
                self.tree.delete(child)
                self.adjust_frame_size()
                if not len(self.base.editorsmanager.active_editors):
                    self.disable()
                return
        
    def set_active(self, editor):
        for child in self.tree.get_children():
            if self.tree.item_fullpath(child) == editor.path:
                self.tree.tree.selection_set(child)
                self.adjust_frame_size()
                return
    
    def clear(self):
        self.tree.delete(*self.tree.get_children())
        self.adjust_frame_size()
    
    def openfile(self, _) -> None:
        if self.tree.selected_type() != 'file':
            return

        path = self.tree.selected_path()
        self.base.open_editor(path)
