import tkinter as tk

from .menubaritem import MenuBarItem

#TODO: implement functions for each menuitem
def placeholder(*args): ...

class MenuBar(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)

        self.base = master.base
        self.master = master

        self.config(bg="#dddddd")

        self.menu_open = False
        self.menus = []

        self.add_menus()
    
    def add_menu(self, text):
        new_menu = MenuBarItem(self, text)
        new_menu.pack(side=tk.LEFT, fill=tk.X, padx=0)
        self.menus.append(new_menu)
        
        return new_menu

    def add_menus(self):
        self.add_file_menu()
        self.add_edit_menu()
        self.add_view_menu()

    # TODO: Implement events for the menu items
    def add_file_menu(self):
        file_menu = self.add_menu("File")
        file_menu.menu.add_first_item("New File", placeholder)
        file_menu.menu.add_item("New Window", placeholder)
        file_menu.menu.add_separator()
        file_menu.menu.add_item("Open File", placeholder)
        file_menu.menu.add_item("Open Folder", placeholder)
        file_menu.menu.add_separator()
        file_menu.menu.add_item("Close Editor", placeholder)
        file_menu.menu.add_item("Close Window", placeholder)
        file_menu.menu.add_separator()
        file_menu.menu.add_last_item("Exit", placeholder)

    def add_edit_menu(self):
        edit_menu = self.add_menu("Edit")
        edit_menu.menu.add_first_item("Undo", placeholder)
        edit_menu.menu.add_item("Redo", placeholder)
        edit_menu.menu.add_separator()
        edit_menu.menu.add_item("Cut", placeholder)
        edit_menu.menu.add_item("Copy", placeholder)
        edit_menu.menu.add_item("Paste", placeholder)
        edit_menu.menu.add_separator()
        edit_menu.menu.add_item("Find", placeholder)
        edit_menu.menu.add_last_item("Replace", placeholder)
    
    def add_view_menu(self):
        view_menu = self.add_menu("View")
        view_menu.menu.add_first_item("Side Bar", placeholder)
        view_menu.menu.add_item("Console", placeholder)
        view_menu.menu.add_item("Status Bar", placeholder)
        view_menu.menu.add_item("Menu", placeholder)
        view_menu.menu.add_separator()
        view_menu.menu.add_item("Syntax", placeholder)
        view_menu.menu.add_item("Indentation", placeholder)
        view_menu.menu.add_last_item("Line Endings", placeholder)

    def close_all_menus(self, event):
        for menu in self.menus:
            menu.hide()
        self.menu_open = False

    def show_menu(self, show):
        for i in self.menus:
            if i.name != show.name:
                i.hide()
    
    def hover_file_menu(self, event):
        if self.menudown:
            self.show_menu(self.file_menu)
            self.file_menu.show(event)
    
    def hover_edit_menu(self, event):
        if self.menudown:
            self.show_menu(self.edit_menu)
            self.edit_menu.show(event)
    
    def hover_view_menu(self, event):
        if self.menudown:
            self.show_menu(self.view_menu)
            self.view_menu.show(event)
