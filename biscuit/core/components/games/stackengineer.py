__author__ = "cid0rz"
version = "0.1"

import random
import tkinter as tk
from collections import Counter, deque
from tkinter import messagebox, ttk

from biscuit.core.components.editors.texteditor import TextEditor

from .game import BaseGame


class Stack(ttk.LabelFrame):
    stack_n = 1

    def __init__(self, parent, text=f'Stack {stack_n}', borderwidth=4, width=300,
                 height=200, columns=[("ID", 20, 'center'), ("Value", 50, 'center')],
                 selectmode='none', values=[], index=0):
        super().__init__(parent, text=text, borderwidth=borderwidth, width=width, height=height)

        self.twscroll = tk.Scrollbar(self)
        self.twscroll.pack(side='right', fill='y')
        self.tw = ttk.Treeview(self, columns=[col[0] for col in columns],
                               yscrollcommand=self.twscroll.set, selectmode=selectmode,
                               displaycolumns=[col[0] for col in columns])
        self.tw.pack()
        self.tw.column("#0", width=0, stretch='no')
        for col in columns:
            self.tw.column(col[0], width=col[1], anchor=col[2])
        for col in columns:
            self.tw.heading(col[0], text=col[0])

        self.twscroll.config(command=self.tw.yview)

        self.values = deque(values)
        self.index = index

    def read(self):
        return self.values[self.index]
    def write(self, value, index):
        self.values[index] = value
        self.update()
    def insert(self, value, index):
        self.values.insert(index, value)
        self.update()
    def push(self, value):
        self.values.appendleft(value)
        self.update()
    def pop(self):
        val = self.values.popleft()
        self.update()
        return val

    def update(self):
        self.tw.delete(*self.tw.get_children())
        for i,val in enumerate(self.values):
            self.tw.insert("", index=i, iid=str(i), values=(i,val))


class StackEngineer(BaseGame):
    name = "Stack Engineer"

    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.editors)
        self.m_registers = {'R1' : None}
        s1 = Stack(self, values=[5,7])
        self.m_stacks = {'S1' : s1}
        self.target = []
        self.cost = 0
        self.score = 0

        self.editor = TextEditor(self, exists=False, minimalist=True)
        self.draw()    

        #print(se.m_stacks['S1'].pop())
        self.m_stacks['S1'].insert(10, 1)

    def draw(self):
        for stack in self.m_stacks:
            stack = self.m_stacks[stack]
            stack.update()
            stack.grid(row=0, column=1)
        editor = self.editor
        editor.grid(row=1)

        # text widget functions are available under editor.text
        # eg.  editor.text.tag_add
