import queue
import subprocess
import platform
import os
from threading import Thread
from tkinter.constants import *
from os import environ

from .text import TerminalText
from ..panelview import PanelView
from core.components.utils import Scrollbar, Label



class Terminal(PanelView):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.__buttons__ = (('add',),('trash',))

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        #get the correct terminal command depending on platform
        self.terminal_command = environ.get('COMSPEC') or environ.get('SHELL')
        if not self.terminal_command:
            Label(self, text="No terminals detected for the host os, report an issue otherwise.").pack()
            return
        
        self.terminal = TerminalText(self, relief=FLAT, padx=10, pady=10, font=("Consolas", 11))
        self.terminal.grid(row=0, column=0, sticky=NSEW)
        self.terminal.bind("<Return>", self.enter)

        self.terminal_scrollbar = Scrollbar(self)
        self.terminal_scrollbar.grid(row=0, column=1, sticky='NSW')

        self.terminal.config(yscrollcommand=self.terminal_scrollbar.set)
        self.terminal_scrollbar.config(command=self.terminal.yview, orient=VERTICAL)

        self.alive = True

        self.p = subprocess.Popen(
            self.terminal_command, stdout=subprocess.PIPE,
            stdin=subprocess.PIPE, stderr=subprocess.PIPE)

        self.out_queue = queue.Queue()
        self.err_queue = queue.Queue()

        t_out = Thread(target=self.process_out)
        t_err = Thread(target=self.process_err)
        t_out.daemon = True
        t_err.daemon = True
        t_out.start()
        t_err.start()

        self.show_prompt()
        self.write_loop()
    
    def show_prompt(self):
        if self.base.sysinfo.os == "Linux":
            self.write("->>")

    def destroy(self):
        self.alive = False

        self.p.stdin.write("exit()\n".encode())
        self.p.stdin.flush()
        
    def enter(self, _):
        command = self.terminal.get('input', 'end')
        
        self.p.stdin.write(command.encode())
        self.p.stdin.flush()

    def process_out(self):
        while self.alive:
            data = self.p.stdout.raw.read(1024)
            self.out_queue.put(data)
        
    def process_err(self):
        while self.alive:
            data = self.p.stderr.raw.read(1024)
            self.err_queue.put(data)

    def write_loop(self):
        """ write data from stdout and stderr to the Text widget"""
        if not self.err_queue.empty():
            self.write(self.err_queue.get())
            self.show_prompt()
        if not self.out_queue.empty():
            self.write(self.out_queue.get())
            self.show_prompt()
        if self.alive:
            self.after(10, self.write_loop)

    def write(self, output):
        self.terminal.insert(END, output)
        self.terminal.see(END)
        self.terminal.mark_set('input', 'insert')
