import inspect
import queue
import tkinter as tk
from datetime import datetime

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
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.__buttons__ = (('clear-all',),('unlock',),('go-to-file',))

        self.rowconfigure(0, weight=1)
        self.columnconfigure(0, weight=1)

        self.queue = queue.Queue()

        self.text = tk.Text(self, relief=tk.FLAT, padx=10, pady=10, 
                            font=("Consolas", 11), **self.base.theme.views.panel.logs)
        self.text.grid(row=0, column=0, sticky=tk.NSEW)

        self.scrollbar = Scrollbar(self)
        self.scrollbar.grid(sticky=tk.NSEW, row=0, column=1)
        
        self.text.config(yscrollcommand=self.scrollbar.set)
        self.scrollbar.config(command=self.text.yview)

        fontbold = ("Consolas", 11, "bold") 

        self.text.tag_config('time', foreground=self.base.theme.views.panel.logs.time)
        self.text.tag_config('caller', foreground=self.base.theme.views.panel.logs.caller)

        self.text.tag_config('info', foreground=self.base.theme.views.panel.logs.info)
        self.text.tag_config('warning', foreground=self.base.theme.views.panel.logs.warning)
        self.text.tag_config('error', foreground=self.base.theme.views.panel.logs.error, font=fontbold)

        self.gui_refresh_loop()

    def gui_refresh_loop(self) -> None:
        if not self.queue.empty():
            self.write(*self.queue.get())
            
        self.after(10, self.gui_refresh_loop)

    def write(self, *args) -> None:
        self.text.config(state=tk.NORMAL)
        for i in args:
            if isinstance(i, tuple):
                self.text.insert(tk.END, i[0], i[1])
            else:
                self.text.insert(tk.END, i)
        self.text.config(state=tk.DISABLED)
        self.text.see(tk.END)
    
    def newline(self) -> None:
        self.queue.put(('\n',))

    def log(self, type: str, caller: str, text: str) -> None:
        self.queue.put(( 
            '[', (datetime.now().strftime("%H:%M:%S:%f"), 'time'), ']', 
            type, 
            '[', (caller, 'caller'), f']: {text}'
        ))
        self.newline()

    def info(self, text: str) -> None:
        "info level log"
        self.log((' [info] ', 'info'), caller_class_name(), text)
    
    def warning(self, text: str) -> None:
        "warning level log"
        self.log((' [warning] ', 'warning'), caller_class_name(), text)
    
    def error(self, text: str) -> None:
        "error level log"
        self.log((' [error] ', 'error'), caller_class_name(), text)
    
    def trace(self, text: str) -> None:
        "trace level log"
        self.log((' [trace] ', 'trace'), caller_class_name(), text)
    
    def rawlog(self, text: str, kind: int):
        match kind:
            case 1:
                self.error(text)
            case 2:
                self.warning(text)
            case 3:
                self.info(text)
            case _:
                self.trace(text)
