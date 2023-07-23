import inspect
import tkinter as tk
from datetime import datetime
from tkinter.constants import *

from ....utils import Scrollbar
from ..panelview import PanelView


def caller_class_name(skip=2):
    """
    Get the name of the class of the caller.

    `skip` specifies how many levels of stack to skip while getting the caller's class.
    skip=1 means "who calls me", skip=2 "who calls my caller" etc.

    An empty string is returned if skipped levels exceed the stack height.
    """
    stack = inspect.stack()
    start = 0 + skip
    if len(stack) < start + 1:
        return ''

    parentframe = stack[start][0]
    class_name = None

    # detect classname
    if 'self' in parentframe.f_locals:
        class_name = parentframe.f_locals['self'].__class__.__name__

    del parentframe, stack

    return class_name


class Logs(PanelView):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.__buttons__ = (('clear-all',),('unlock',),('go-to-file',))

        self.rowconfigure(0, weight=1)
        self.columnconfigure(0, weight=1)

        self.text = tk.Text(self, relief=FLAT, padx=10, pady=10, 
                            font=("Consolas", 11), **self.base.theme.views.panel.logs)
        self.text.grid(row=0, column=0, sticky=NSEW)

        self.scrollbar = Scrollbar(self)
        self.scrollbar.grid(sticky=NSEW, row=0, column=1)
        
        self.text.config(yscrollcommand=self.scrollbar.set)
        self.scrollbar.config(command=self.text.yview)

        fontbold = ("Consolas", 11, "bold") 

        self.text.tag_config('time', foreground=self.base.theme.views.panel.logs.time)
        self.text.tag_config('caller', foreground=self.base.theme.views.panel.logs.caller)

        self.text.tag_config('info', foreground=self.base.theme.views.panel.logs.info)
        self.text.tag_config('warning', foreground=self.base.theme.views.panel.logs.warning)
        self.text.tag_config('error', foreground=self.base.theme.views.panel.logs.error, font=fontbold)

    def write(self, *args):
        self.text.config(state=NORMAL)
        for i in args:
            if isinstance(i, tuple):
                self.text.insert(END, i[0], i[1])
            else:
                self.text.insert(END, i)
        self.text.config(state=DISABLED)
        self.text.see(END)
    
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
        "info level log"
        self.log((' [info] ', 'info'), caller_class_name(), text)
    
    def warning(self, text):
        "warning level log"
        self.log((' [warning] ', 'warning'), caller_class_name(), text)
    
    def error(self, text):
        "error level log"
        self.log((' [error] ', 'error'), caller_class_name(), text)
