import os
import platform
import tkinter as tk

from ..panelview import PanelView
from .menu import TerminalMenu
from .shells import SHELLS, Default
from .tabs import Tabs


def get_home_directory() -> str:
    if os.name == 'nt':
        return os.path.expandvars("%USERPROFILE%")
    if os.name == 'posix':
        return os.path.expanduser("~")
    return '.'

class Terminal(PanelView):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)

        self.config(bg=self.base.theme.border)
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)
        self.grid_propagate(False)

        self.addmenu = TerminalMenu(self, "addterminal")
        for i in SHELLS:
            self.addmenu.add_item(i.name, lambda i=i: self.open_shell(i))

        self.menu = TerminalMenu(self, "terminal")
        self.menu.add_item("Clear Terminal", self.clear_terminal)
        
        self.__buttons__ = [('add', self.addmenu.show), ('trash', self.delete_active_terminal), ('ellipsis', self.menu.show)]

        self.tabs = Tabs(self)
        self.tabs.grid(row=0, column=1, padx=(1, 0), sticky=tk.NS)

        self.terminals = []

        self.default_terminal = Default(self, cwd=self.base.active_directory or get_home_directory())
        self.add_terminal(self.default_terminal)
    
    def add_current_terminal(self, *_) -> None:
        "Spawns an instance of currently active terminal"
        self.add_terminal(self.active_terminal_type(self, cwd=self.base.active_directory or get_home_directory()))

    def add_terminals(self, terminals) -> None:
        "Append terminals to list. Create tabs for them."
        for terminal in terminals:
            self.add_terminal(terminal)
    
    def add_terminal(self, terminal) -> None:
        "Appends a terminal to list. Create a tab."
        self.terminals.append(terminal)
        self.tabs.add_tab(terminal)
    
    def open_shell(self, shell) -> None:
        self.add_terminal(shell(self, cwd=self.base.active_directory or get_home_directory()))
    
    def open_terminal(self, path=None) -> None:
        self.add_terminal(self.active_terminal_type(self, cwd=path or self.base.active_directory or get_home_directory()))

    def delete_all_terminals(self) -> None:
        "Permanently delete all terminals."
        for terminal in self.terminals:
            terminal.destroy()

        self.tabs.clear_all_tabs()
        self.terminals.clear()
    
    def delete_terminal(self, terminal) -> None:
        "Permanently delete a terminal."
        terminal.destroy()
        self.terminals.remove(terminal)
    
    def delete_active_terminal(self) -> None:
        "Closes the active tab"
        self.tabs.close_active_tab()
   
    def set_active_terminal(self, terminal) -> None:
        "set an existing terminal to currently shown one"
        for tab in self.tabs.tabs:
            if tab.terminal == terminal:
                self.tabs.set_active_tab(tab)
    
    def clear_terminal(self, *_) -> None:
        if active := self.active_terminal:
            active.clear()
    
    # @property
    # def pwsh(self):
    #     return self.default_terminals[0]
    
    # @property
    # def cmd(self):
    #     return self.default_terminals[1]

    # @property
    # def python(self):
    #     return self.default_terminals[1]

    @property
    def active_terminal_type(self):
        if active := self.active_terminal:
            return type(active)
        
        return Default
   
    @property
    def active_terminal(self):
        "Get active terminal."
        if not self.tabs.active_tab:
            return
        
        return self.tabs.active_tab.terminal
    
    def refresh(self) -> None:
        if not self.terminals:
            self.master.toggle_panel()
