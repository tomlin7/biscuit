# TODO Palette
#   - working commands
#   - sub menus


import tkinter as tk

from .item import MenuItem
from .searchbar import Searchbar
from .actionset import ActionSet

from core.components.utils import Toplevel


class Palette(Toplevel):
    """
    Palette

    Palette is an action menu centered horizontally and aligned to top of root.
    They contain a list of actions.

    +----------------------------------------------+
    |  \   | search                         |  \   |
    |   \  +--------------------------------+   \  |
    |    \    \    \    \    \    \    \    \    \ |
    |\    \    \    \    \    \    \    \    \    \|
    | \    \    \    \    \    \    \    \    \    |
    |  \    \    \    \    \    \    \    \    \   |
    |   \    \    \    \    \    \    \    \    \  |
    +----------------------------------------------+
    """
    def __init__(self, master, items=None, width=60,*args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(pady=1, bg=self.base.theme.border)
        
        self.width = round(width * self.base.scale)
        self.active = False

        self.withdraw()
        self.overrideredirect(True)

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.row = 1
        self.selected = 0

        self.shown_items = []

        self.actionsets = []
        self.active_set = None
        self.add_search_bar()
        
        self.configure_bindings()

    def register_actionset(self, actionset):
        self.actionsets.append(actionset)
    
    def generate_help_actionset(self):
        actionset = ActionSet("Help", "?", [("? Help", lambda e=None:print("Help e"))])
        for i in self.actionsets:
            i = i() # get the actionset
            if i.prompt:
                actionset.append((f"{i.prompt} {i.id}", lambda e=None:print(f"Help {i.id}")))

    def add_item(self, text, command):
        new_item = MenuItem(self, text, command)
        new_item.grid(row=self.row, sticky=tk.EW, padx=1, pady=(0, 0))
        
        self.shown_items.append(new_item)

        self.row += 1
        self.refresh_selected()
        return new_item

    def add_search_bar(self):
        self.search_bar = Searchbar(self)
        self.search_bar.grid(row=0, sticky=tk.EW, pady=5, padx=5)
    
    def configure_bindings(self):
        self.bind("<FocusOut>", self.hide)
        self.bind("<Escape>", self.hide)

        self.row += 1
        self.refresh_selected()
    
    def pick_actionset(self, actionset):
        self.active_set = actionset
    
    def pick_file_search(self):
        self.active_set = self.base.explorer.get_actionset()
        
    def choose(self, *_):
        #TODO pass the term to the function as argument (for input requiring commands)
        self.shown_items[self.selected].command()
        self.hide()
        
    def get_items(self):
        return self.active_set
    
    def hide(self, *args):
        self.withdraw()
        self.reset()
        
    def hide_all_items(self):
        for i in self.shown_items:
            i.destroy()
        
        self.shown_items = []
        self.row = 1
    
    def reset_selection(self):
        self.selected = 0
        self.refresh_selected()

    def refresh_selected(self):
        if not self.shown_items:
            return

        for i in self.shown_items:
            i.deselect()
        
        try:
            self.shown_items[self.selected].select()
        except IndexError:
            self.base.logger.error(f"Command '{self.selected}' doesnt exist")
    
    def reset(self):
        self.search_bar.clear()
        self.reset_selection()

    def search_bar_enter(self, *args):
        self.choose()
        return "break"
    
    def show_no_results(self):
        self.hide_all_items()
        self.reset_selection()
        self.add_item("No results found", lambda:...)

    def select(self, delta):
        self.selected += delta
        self.selected = min(max(0, self.selected), len(self.shown_items) - 1)
        self.refresh_selected()
    
    def show_items(self, items):
        self.hide_all_items()

        for i in items[:10]:
            self.add_item(*i)

        self.reset_selection()

    def show_prompt(self, prompt):
        self.update_idletasks()
        x = self.master.winfo_rootx() + int((self.master.winfo_width() - self.winfo_width())/2)
        y = self.master.winfo_rooty()
        self.geometry(f"+{x}+{y}")
        self.deiconify()
        self.focus_set()
        self.search_bar.focus()
        self.search_bar.add_prompt(prompt)
