import tkinter as tk

from .item import MenubarItem

from core.components.utils import Frame


class Menubar(Frame):
    """
    Root frame holds Menubar, BaseFrame, and Statusbar
    .
    App
    └── Root
        ├── Menubar
        ├── BaseFrame
        └── Statusbar
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.menus = []

        self.config(bg=self.base.theme.layout.menubar.background)
        self.events = self.base.events
        self.add_menus()
        
    def add_menu(self, text):
        new_menu = MenubarItem(self, text)
        new_menu.pack(side=tk.LEFT, fill=tk.X, padx=0)
        self.menus.append(new_menu.menu)
        
        return new_menu.menu

    def add_menus(self):
        self.add_file_menu()
        self.add_edit_menu()
        self.add_view_menu()

    # TODO: Implement events for the menu items
    def add_file_menu(self):
        events = self.events

        file_menu = self.add_menu("File")
        file_menu.add_item("New File", events.new_file)
        file_menu.add_item("New Window", events.new_window)
        file_menu.add_separator()
        file_menu.add_item("Open File", events.open_file)
        file_menu.add_item("Open Folder", events.open_directory)
        # TODO open recent files 
        file_menu.add_separator()
        file_menu.add_item("Close Editor", events.close_file)
        file_menu.add_item("Close Folder", events.close_dir)
        file_menu.add_item("Close Window", events.quit)
        file_menu.add_separator()
        file_menu.add_item("Save", events.save)
        file_menu.add_item("Save As...", events.save_as)
        file_menu.add_item("Save All", events.save_all)
        file_menu.add_separator()
        file_menu.add_item("Exit", events.quit)

    def add_edit_menu(self):
        events = self.events

        edit_menu = self.add_menu("Edit")
        edit_menu.add_item("Undo", events.undo)
        edit_menu.add_item("Redo", events.redo)
        edit_menu.add_separator()
        edit_menu.add_item("Cut", events.cut)
        edit_menu.add_item("Copy", events.copy)
        edit_menu.add_item("Paste", events.paste)
        edit_menu.add_separator()
        edit_menu.add_item("Find",)
        edit_menu.add_item("Replace",)
    
    def add_view_menu(self):
        events = self.events

        view_menu = self.add_menu("View")
        view_menu.add_item("Side Bar",)
        view_menu.add_item("Console",)
        view_menu.add_item("Status Bar",)
        view_menu.add_item("Menu",)
        view_menu.add_separator()
        view_menu.add_item("Syntax",)
        view_menu.add_item("Indentation",)
        view_menu.add_item("Line Endings",)

    def close_all_menus(self, *_):
        for menu in self.menus:
            menu.hide()

    def switch_menu(self, menu):
        active = False
        for i in self.menus:
            if i.active:
                active = True
            if i != menu:
                i.hide()
        
        if active:
            menu.show()
