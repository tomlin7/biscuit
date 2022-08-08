import inspect
import tkinter as tk

from datetime import datetime

from ....utils import Scrollbar
from ...view import View


def caller_name(skip=2):
    """
    Get the name of a caller in the format module.class.method

    `skip` specifies how many levels of stack to skip while getting caller
    name. skip=1 means "who calls me", skip=2 "who calls my caller" etc.

    An empty string is returned if skipped levels exceed stack height
    """
    stack = inspect.stack()
    start = 0 + skip
    if len(stack) < start + 1:
      return ''
    parentframe = stack[start][0]    

    name = []
    module = inspect.getmodule(parentframe)
    # `modname` can be None when frame is executed directly in console
    if module:
        name.append(module.__name__)
    # detect classname
    if 'self' in parentframe.f_locals:
        name.append(parentframe.f_locals['self'].__class__.__name__)
    codename = parentframe.f_code.co_name
    if codename != '<module>': 
        name.append(codename)

    del parentframe, stack

    return ".".join(name)


class Logs(View):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.rowconfigure(0, weight=1)
        self.columnconfigure(0, weight=1)

        self.text = tk.Text(self, relief=tk.FLAT) # , font=("Consolas", 13)
        self.text.grid(row=0, column=0, sticky=tk.NSEW)

        self.scrollbar = Scrollbar(self)
        self.scrollbar.grid(sticky=tk.NSEW, row=0, column=1)
        
        self.text.config(yscrollcommand=self.scrollbar.set)
        self.scrollbar.config(command=self.text.yview)

        fontbold = ('Courier New', 10, 'bold') # ("Consolas", 13, "bold")

        self.text.tag_config('time', foreground="#008000")
        self.text.tag_config('caller', foreground="#0000ff")

        self.text.tag_config('info', foreground="#098677")
        self.text.tag_config('warning', foreground="#a31515")
        self.text.tag_config('error', foreground="#ab1515", font=fontbold)

    def write(self, *args):
        self.text.config(state=tk.NORMAL)
        for i in args:
            if isinstance(i, tuple):
                self.text.insert(tk.END, i[0], i[1])
            else:
                self.text.insert(tk.END, i)
        self.text.config(state=tk.DISABLED)
        self.text.see(tk.END)
    
    def newline(self):
        self.write('\n')

    def log(self, type, caller, text):
        self.write(
            '[', (datetime.now(), 'time'), ']', 
            type, 
            '[', (caller, 'caller'), f']: {text}'
        )
        self.newline()

    def info(self, text):
        self.log((' [info] ', 'info'), caller_name(), text)
    
    def warning(self, text):
        self.log((' [warning] ', 'warning'), caller_name(), text)
    
    def error(self, text):
        self.log((' [error] ', 'error'), caller_name(), text)
