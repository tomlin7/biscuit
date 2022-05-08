import tkinter as tk
import os
import queue
import subprocess
from sys import platform

from threading import Thread
from ..utils import AutoScrollbar


class Terminal(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.font = self.base.settings.font
        self.config(background="#ffffff")
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.terminal = tk.Text(
            self, wrap=tk.WORD, font=self.font, relief=tk.FLAT,
            fg="#333333", bg="#ffffff", padx=10, pady=10
        )
        self.terminal.grid(row=0, column=0, sticky=tk.NSEW)

        self.terminal_scrollbar = AutoScrollbar(self.terminal)
        self.terminal_scrollbar.grid(row=0, column=1, sticky=tk.NS)

        self.terminal.config(yscrollcommand=self.terminal_scrollbar.set)
        self.terminal_scrollbar.config(command=self.terminal.yview)

        self.line_start = 0
        self.alive = True

        if self.base.sysinfo.os == "Linux":
            shell = ["/bin/bash"]
            identifier = "bash~$"
        else:
            shell = ["cmd"]
            identifier = "cmd>"
        self.p = subprocess.Popen(
            shell, stdout=subprocess.PIPE,
            stdin=subprocess.PIPE, stderr=subprocess.PIPE)
        self.out_queue = queue.Queue()
        self.err_queue = queue.Queue()

        Thread(target=self.read_from_proccessOut).start()
        Thread(target=self.read_from_proccessErr).start()

        self.terminal_prompt = identifier
        
        self.write(self.terminal_prompt)

        self.terminal.bind("<Return>", self.enter)

        
    def destroy(self):
        self.alive = False

        self.p.stdin.write("exit()\n".encode())
        self.p.stdin.flush()

    def enter(self, e):
        """The <Return> key press handler"""
        string = self.terminal.get(1.0, tk.END)[self.line_start:]
        self.line_start += len(string)
        self.p.stdin.write(string.encode())
        self.p.stdin.flush()
        self.alive = True
        self.write_loop()

    def read_from_proccessOut(self):
        """To be executed in a separate thread to make read non-blocking"""
        while True:
            data = self.p.stdout.raw.read(1024)
            self.out_queue.put(data)

    def read_from_proccessErr(self):
        """To be executed in a separate thread to make read non-blocking"""
        while True:
            data = self.p.stderr.raw.read(1024)
            self.err_queue.put(data)

    def write_loop(self):
        """ write data from stdout and stderr to the Text widget"""
        if not self.err_queue.empty():
            self.write(self.err_queue.get())
        if not self.out_queue.empty():
            self.write(self.out_queue.get())

        if self.alive:
            self.after(10, self.write_loop)
        if self.err_queue.empty() and self.out_queue.empty():
            if not self.alive:
                self.after(10, self.write(self.terminal_prompt))
            self.alive = False

    def write(self, output):
        self.terminal.insert(tk.END, output)
        self.terminal.see(tk.END)
        self.line_start += len(output)

    def automation(self, string):
        self.terminal.insert(tk.END, string)
        self.terminal.see(tk.END)
        self.enter("test")
        self.terminal.insert(tk.END, "\n")
