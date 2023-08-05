__author__ = "cid0rz"
version = "0.1"

import random
import tkinter as tk
from collections import Counter, deque
from tkinter import messagebox, ttk


from biscuit.core.components.editors.texteditor import TextEditor

from biscuit.core.components.games.game import BaseGame
from biscuit.core.components.editors.languages import Languages



HELP_TEXT = """Stack Engineer is a small coding game where you have to manage data to achieve objectives.
The machine has 3 registers:
-NR: Number register. It manages numerical values to do operations and to get and put values to stacks.
-TR: Text register. It manages strings to do operations on them and to get and put strings to stacks.
-TEST: Test register. it is a register that stores the result of the last comparison executed and when it is TRUE
       it executes the following jump instruction.
The machine has always one stack initialized (S1) and can have more. These initialized stacks will have relevant
data to complete the exercises. The user can add stacks on demand.

The syntax of the language is as follows:




"""


class TestLabel(tk.Label):

    def __init__(self, parent, *args, textvariable=None,  **kwargs):
        super().__init__(parent, *args, textvariable=textvariable,**kwargs)
        self.stringvar = textvariable
        self.stringvar.trace_add("write", self.setcolor)
        self.setcolor()

    def setcolor(self, *args):
        val = self.stringvar.get()
        if val == "TRUE":
            self.config(fg='green')
        else:
            self.config(fg='red')
        


class Stack(ttk.LabelFrame):

    def __init__(self, parent, text='', borderwidth=4, width=300,
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
    def empty(self):
        self.values = deque([])
        self.update()
    def load(self, vals):
        self.values = deque(vals)
        self.update()
    def update(self):
        self.tw.delete(*self.tw.get_children())
        for i,val in enumerate(self.values):
            self.tw.insert("", index=i, iid=str(i), values=(i,val))

        
class StackEngineer(BaseGame):
    name = f"Stack Engineer v{version}"

    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.editors)

        self.stacks = {}
        self.target = []
        self.cost = 0
        self.level = 1
        self.stack_id = 0
        self.line_pos = 1
        self.number_register = tk.IntVar()
        self.text_register = tk.StringVar()
        self.test_register = tk.StringVar()

        self.stacks_frame = tk.Frame(self)
        self.result_stack = Stack(self.stacks_frame, text="RESULT")
        self.result_stack.grid(row=0, column=0, pady=(3,3), sticky='w')
        self.stacks_frame.grid(row=0, column=0, sticky='w')
        
        self.editor = TextEditor(self, exists=False, minimalist=True, language=Languages.NASM)
        self.editor.grid(row=1, column=0)

        self.buttons = tk.Frame(self)
        self.buttons.grid(row=1, column=11)
        self.add_stack_btn = tk.Button(self.buttons,text="Add Stack", command=self.add_stack)
        self.add_stack_btn.grid(row=0, column=0)
        self.step_once_btn = tk.Button(self.buttons,text="Step Once", command=self.step_once)
        self.step_once_btn.grid(row=1,column=0)
        self.run_program_btn = tk.Button(self.buttons,text="Run", command=self.run_program)
        self.run_program_btn.grid(row=2, column=0)
        self.reset_program_btn = tk.Button(self.buttons, text="Reset program", command=self.reset_program)
        self.reset_program_btn.grid(row=3, column=0)

        self.registers = tk.Frame(self)
        self.registers.grid(row=3, column=0, sticky="ew")
        self.nr_label_desc = tk.Label(self.registers, text="NR: ")
        self.nr_label_desc.grid(row=0,column=0)
        self.nr_text = tk.Label(self.registers, bd=1, relief='groove', textvariable=self.number_register, width=100)
        self.nr_text.grid(row=0, column=1, sticky="ew")
        self.tr_label_desc = tk.Label(self.registers, text="TR: ")
        self.tr_label_desc.grid(row=1, column=0)
        self.tr_text = tk.Label(self.registers, bd=1, relief='groove', textvariable=self.text_register, width=100)
        self.tr_text.grid(row=1, column=1, sticky="ew")
        self.test_label_desc = tk.Label(self.registers, text="TEST")
        self.test_label_desc.grid(row=0, column=2, padx=(5,5) )
        self.test_text = TestLabel(self.registers, textvariable=self.test_register)
        self.test_text.grid(row=1, column=2 , padx=(5,5))
        self.test_register.set("FALSE")

        #print(self.stacks['S1'].pop())
        #self.stacks['S1'].insert(10, 1)      
                

        # text widget functions are available under editor.text
        # eg.  editor.text.tag_add

        self.start_level()

    def add_stack(self):
        self.stack_id += 1
        s_name = f'S{self.stack_id}'
        s = Stack(self.stacks_frame, text = s_name )
        self.stacks[s_name] = s
        s.grid(row=0, column=(len(self.stacks)+1), pady=(3,3), sticky='w')
        
    def step_once(self):
        """Execute one line of the program"""
        linestart = str(self.line_pos) + ".0"
        lineend = linestart + " lineend"
        line = self.editor.text.get(linestart, lineend)
        self.interpret_line(line)
                
        if self.line_pos > self.get_last_line():
            self.end_round()
        else:
            self.mark_line(self.line_pos)
            

    def get_last_line(self):
        last_line_index = self.editor.text.index("end - 1 line")
        last_line = int(last_line_index.split('.')[0])
        return last_line

    def mark_line(self, line, marker="->"):
        linestart = str(line) + ".0"
        self.editor.linenumbers.remove_mark()
        self.editor.linenumbers.mark_line(linestart, marker="->")
        

    def run_program(self):
        """Execute the program till the end"""
        while self.line_pos <= self.get_last_line():
            self.step_once()

    def end_round(self):
        """Calculate score and offer to retry or go to next level or exit"""
        dialog = tk.Toplevel(self)
        dialog_font = ("Arial", 15)
        dialog.title("Round Finished")
        level_lbl = tk.Label(dialog, text=f"Level: {self.level} ", font=dialog_font)
        level_lbl.grid(row=0, column=0)
        cost_lbl = tk.Label(dialog, text=f"Cost: {self.cost} ", font=dialog_font)
        cost_lbl.grid(row=0, column=1)
        retry_btn = tk.Button(dialog, text="Retry Level", font=dialog_font)
        retry_btn.grid(row=1, column=0)
        next_btn = tk.Button(dialog, text="Next Level", font=dialog_font)
        next_btn.grid(row=1, column=1)

    def show_error(self, error_msg="No error msg provided."):
        """Show an error when a problem is encountered and offer to restart the execution"""
        error = tk.Toplevel(self)
        error.title("Error in code")
        error_lbl= tk.Label(error, text=f"Error in line {self.line_pos}: {error_msg} ")
        error_lbl.pack()

    def reset_program(self):
        """Restart program execution"""
        self.labels = {}
        self.line_pos = 1
        self.mark_line(self.line_pos)
        self.number_register.set(0)
        self.text_register.set("")
        

    def start_level(self, level=1):
        """Set up the solution and initial conditions, reset cost"""
        self.cost = 0
        self.labels = {}
        self.line_pos = 1
        self.mark_line(self.line_pos)
        #load solution

    def interpret_line(self, line):
        """get a line of code an process it"""
        if line.startswith("#"):
            self.line_pos +=1
            return
        line = line.split("#",1)[0]
        linelist = line.upper().split()
        
        print(linelist)
        if len(linelist) == 0:
            pass
        elif len(linelist) == 1 and linelist[0][-1] == ":":
            self.labels[linelist[0][:-1]] = self.line_pos
            print(self.labels)
        elif len(linelist) == 3:
            inst = linelist[0] #command to execute
            if inst == "PUSH":
                stack_n = linelist[2] #stack to push to
                reg = linelist[1] # register to push from
                if stack_n not in self.stacks:
                    self.show_error(error_msg=f"Stack {stack_n} not available, you can create it and restart the game")
                else:
                    if reg not in ['NR', 'TR']:
                        self.show_error(error_msg=f"{linelist[1]} is not a valid register")
                    elif reg == 'NR':
                        val = self.number_register.get()
                        self.stacks[stack_n].push(val)
                    elif reg == 'TR':
                        val = self.text_register.get()
                        self.stacks[stack_n].push(val)

            elif inst == "POP":
                stack_n = linelist[1] #stack to pop from
                if stack_n not in self.stacks:
                    self.show_error(error_msg=f"{stack_n} is not a valid stack")
                else:
                    val = self.stacks[linelist[1]].pop()
                    print(val, type(val))
                    self.number_register.set(val)

        elif len(linelist) == 2:
            inst = linelist[0] #command to execute
            if inst == "ADD":
                val = linelist[1] #thing to add
                print(val, type(val))
            elif inst == "SUB":
                pass
            elif inst == "MUL":
                pass
            elif inst == "DIV":
                pass
            
        self.line_pos += 1

        
