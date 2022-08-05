import tkinter as tk

from .item import MenuItem
from .searchbar import Searchbar


class PopupMenu(tk.Toplevel):
    """
    Popup Menus

    Popup menus are centered horizontally and aligned to top of root.
    They contain a list of options to choose from.

    +----------------------------------------------+
    |  \   | item_name                      |  \   |
    |   \  +--------------------------------+   \  |
    |    \    \    \    \    \    \    \    \    \ |
    |\    \    \    \    \    \    \    \    \    \|
    | \    \    \    \    \    \    \    \    \    |
    |  \    \    \    \    \    \    \    \    \   |
    |   \    \    \    \    \    \    \    \    \  |
    +----------------------------------------------+
    """
    def __init__(self, master, items=None, width=65, state=False, prompt="", watermark="Search", *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        
        self.width = width
        self.state = state
        self.prompt = prompt
        self.watermark = watermark

        if not state:
            self.withdraw()
        self.overrideredirect(True)

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.menu_items = []
        self.menu_items_text = []

        self.row = 1
        self.selected = 0
        self.no_results = MenuItem(self, "No results found", lambda e=None: None)

        self.add_search_bar(prompt, watermark)

        if items:
            self.items = items
            
        self.add_all_items()
        self.refresh_selected()

        self.configure_bindings()

    def add_all_items(self):
        if self.items:
            for i in self.items[:-1]:
                self.add_item(i[0], i[1])
            self.add_last_item(self.items[-1][0], self.items[-1][1])

    def add_item(self, text, command):
        new_item = MenuItem(self, text, command)
        new_item.grid(row=self.row, sticky=tk.EW, padx=1, pady=(0, 0))
        
        self.menu_items.append(new_item)
        self.menu_items_text.append((text.lower(), new_item))

        self.row += 1
        self.refresh_selected()
        
    def add_last_item(self, text, command):
        new_item = MenuItem(self, text, command)
        new_item.grid(row=self.row, sticky=tk.EW, padx=1, pady=(0, 5))
        
        self.menu_items.append(new_item)
        self.menu_items_text.append((text.lower(), new_item))

    def add_search_bar(self, prompt, watermark):
        self.search_bar = Searchbar(self, prompt=prompt, watermark=watermark)
        self.search_bar.grid(row=0, sticky=tk.EW, padx=8, pady=(8, 5))
    
    def configure_bindings(self):
        self.bind("<FocusOut>", self.hide)
        self.bind("<Escape>", self.hide)

        self.row += 1
        self.refresh_selected()

    def choose(self, *args):
        self.menu_items[self.selected].command()
        self.hide()
    
    def get_popup_x(self, width):
        return self.winfo_rootx() + int(self.winfo_width() / 2) - int(width / 2)

    def get_popup_y(self):
        return self.winfo_rooty()

    def get_items(self):
        return self.menu_items
    
    def get_items_text(self):
        return self.menu_items_text
    
    def hide(self, *args):
        self.withdraw()
        self.reset()
        
    def hide_all_items(self):
        for i in self.menu_items:
            i.grid_forget()
        
        self.menu_items = []
        self.row = 1
    
    def reset_selection(self):
        self.selected = 0
        self.refresh_selected()

    def refresh_selected(self):
        for i in self.menu_items:
            i.deselect()
        self.menu_items[self.selected].select()
    
    def reset(self):
        self.search_bar.clear()
        self.reset_selection()

    def search_bar_enter(self, *args):
        self.choose()
        return "break"
    
    def show_no_results(self):
        self.no_results.grid(row=1, sticky=tk.EW, padx=1, pady=(0, 5))
        self.menu_items.append(self.no_results)

        self.row = 1
        self.reset_selection()

    def select(self, delta):
        self.selected += delta
        self.selected = min(max(0, self.selected), len(self.menu_items) - 1)
        self.refresh_selected()
    
    def show_items(self, items, search_term):
        for i in items[:-1]:
            i[1].grid(row=self.row, sticky=tk.EW, padx=1, pady=(0, 0))
            self.row += 1
            self.menu_items.append(i[1])
        items[-1][1].grid(row=self.row, sticky=tk.EW, padx=1, pady=(0, 5))
        self.row += 1
        self.menu_items.append(items[-1][1])

        self.reset_selection()

    def show(self, *args):
        self.update_idletasks()
        x = self.get_popup_x(self.winfo_width())
        y = self.get_popup_y()
        self.wm_geometry(f"+{x}+{y}")
        self.deiconify()
        
        self.focus_set()
        self.search_bar.focus()


# experimental tcl for centering window

# root.eval('tk::PlaceWindow . center')
# second_win = tkinter.Toplevel(root)
# root.eval(f'tk::PlaceWindow {str(second_win)} center')
