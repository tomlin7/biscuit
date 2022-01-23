import tkinter as tk


class Menu(tk.Toplevel):
    def __init__(self, root, name, *args, **kwargs):
        super().__init__(root, *args, **kwargs)

        self.root = root
        self.name = name
        
        self.configure(bg='#ffffff')
        self.withdraw()
        self.overrideredirect(True)
        # self.wm_attributes("-topmost", 1)

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.menu_items = []

        self.row = 0

    def add_first_item(self, text, command):
        new_btn = self.get_button(text)
        new_btn.grid(row=self.row, sticky=tk.EW, padx=1, pady=(10, 0)) # pack(fill=tk.X, side=tk.TOP, padx=1, pady=(10, 0))
        new_btn.bind("<Button-1>", command)
        self.menu_items.append(new_btn)

        self.row += 1
    
    def add_item(self, text, command):
        new_btn = self.get_button(text)
        new_btn.grid(row=self.row, sticky=tk.EW, padx=1, pady=(0, 0)) # pack(fill=tk.X, side=tk.TOP, padx=1, pady=(0, 0))
        new_btn.bind("<Button-1>", command)
        self.menu_items.append(new_btn)

        self.row += 1

    def add_last_item(self, text, command):
        new_btn = self.get_button(text)
        new_btn.grid(row=self.row, sticky=tk.EW, padx=1, pady=(0, 10)) # pack(fill=tk.X, side=tk.TOP, padx=1, pady=(0, 10))
        new_btn.bind("<Button-1>", command)
        self.menu_items.append(new_btn)

        self.row += 1

    def add_separator(self):
        new_lbl = tk.Label(
            self, text="—————————————————————————",
            padx=10, bg="#ffffff", fg="#d4d4d4", height=1
        )
        new_lbl.grid(row=self.row, sticky=tk.EW, padx=2, pady=(0, 0)) # pack(fill=tk.X, side=tk.TOP, padx=2, pady=(0, 0))
        self.menu_items.append(new_lbl)

        self.row += 1
    
    def get_button(self, text):
        return tk.Menubutton( 
            self, text=text, anchor = tk.W, font="Helvetica 11",
            padx=30, bg="#ffffff", fg="#7d7d7d", pady=5,
            activebackground="#0060c0", activeforeground="#ffffff"
        )

    def show(self, *args):
        # self.new_btn.grid(row=self.row, sticky=tk.EW, padx=2)
        # self.row += 1

        self.update_idletasks()
        x,y,cx,cy = self.root.bbox(tk.INSERT)
        x = x + self.root.winfo_rootx()
        y = y + cy + self.root.winfo_rooty() + 35
        self.wm_geometry(f"+{x}+{y}")
        self.deiconify()

    def hide(self, *args):
        self.withdraw()
    
    

def hello(*args):
    print("hello")


class MenuBar(tk.Frame):
    def __init__(self, _root, *args, **kwargs):
        super().__init__(_root, *args, **kwargs)
        self._root = _root

        self.menudown = False

        self._offsetx = 0
        self._offsety = 0
        self._root.bind('<Button-1>',self.clickwin)
        self._root.bind('<B1-Motion>',self.dragwin)
        self._root.bind('<Configure>', self.rootmotion)

        # self._root.attributes('-alpha', 0.5)

        self.file_menu_button = tk.Menubutton(
            self, text="File", font="Helvetica 11",
            padx=9, bg="#dddddd", fg="#575757", pady=8,
            activebackground="#c6c6c6", activeforeground="#575757"
        )
        self.edit_menu_button = tk.Menubutton(
            self, text="Edit", font="Helvetica 11",
            padx=9, bg="#dddddd", fg="#575757", pady=8,
            activebackground="#c6c6c6", activeforeground="#575757",
        )

        self.view_menu_button = tk.Menubutton(
            self, text="View", font="Helvetica 11",
            padx=9, bg="#dddddd", fg="#575757", pady=8,
            activebackground="#c6c6c6", activeforeground="#575757"
        )

        self.menus = []

        self.file_menu = Menu(self._root, "file")
        self.edit_menu = Menu(self._root, "edit")
        self.view_menu = Menu(self._root, "view")

        self.menus += [self.file_menu, self.edit_menu, self.view_menu]

        self.file_menu.add_first_item("New File", hello)
        self.file_menu.add_item("New Window", hello)
        self.file_menu.add_separator()
        self.file_menu.add_item("Open File", hello)
        self.file_menu.add_item("Open Folder", hello)
        self.file_menu.add_separator()
        self.file_menu.add_item("Close Editor", hello)
        self.file_menu.add_item("Close Window", hello)
        self.file_menu.add_separator()
        self.file_menu.add_last_item("Exit", hello)


        self.edit_menu.add_first_item("Undo", hello)
        self.edit_menu.add_item("Redo", hello)
        self.edit_menu.add_separator()
        self.edit_menu.add_item("Cut", hello)
        self.edit_menu.add_item("Copy", hello)
        self.edit_menu.add_item("Paste", hello)
        self.edit_menu.add_separator()
        self.edit_menu.add_item("Find", hello)
        self.edit_menu.add_last_item("Replace", hello)

        self.view_menu.add_first_item("Side Bar", hello)
        self.view_menu.add_item("Console", hello)
        self.view_menu.add_item("Status Bar", hello)
        self.view_menu.add_item("Menu", hello)
        self.view_menu.add_separator()
        self.view_menu.add_item("Syntax", hello)
        self.view_menu.add_item("Indentation", hello)
        self.view_menu.add_last_item("Line Endings", hello)

        self.file_menu_button.bind("<Button-1>", self.show_file_menu)
        self.edit_menu_button.bind("<Button-1>", self.show_edit_menu)
        self.view_menu_button.bind("<Button-1>", self.show_view_menu)

        self.file_menu_button.bind("<Enter>", self.hover_file_menu)
        self.edit_menu_button.bind("<Enter>", self.hover_edit_menu)
        self.view_menu_button.bind("<Enter>", self.hover_view_menu)

        self.file_menu_button.pack(side=tk.LEFT, fill=tk.X, padx=0)
        self.edit_menu_button.pack(side=tk.LEFT, fill=tk.X, padx=0)
        self.view_menu_button.pack(side=tk.LEFT, fill=tk.X, padx=0)

        # ✕ ☐ ─
        self.minimize = tk.Menubutton(
            self, text="─", font="Helvetica 12", anchor=tk.E,
            padx=20, bg="#dddddd", fg="#575757", pady=8,
            activebackground="#c6c6c6", activeforeground="#575757"
        )
        self.maximize = tk.Menubutton(
            self, text="◻", font="Helvetica 12", anchor=tk.E,
            padx=20, bg="#dddddd", fg="#575757", pady=8,
            activebackground="#c6c6c6", activeforeground="#575757"
        )
        self.close = tk.Menubutton(
            self, text="✕", font="Helvetica 12", anchor=tk.E,
            padx=20, bg="#dddddd", fg="#575757", pady=8,
            activebackground="#e72535", activeforeground="#ffffff"
        )
        self.close.pack(side=tk.RIGHT, fill=tk.X, padx=0)
        self.maximize.pack(side=tk.RIGHT, fill=tk.X, padx=0)
        self.minimize.pack(side=tk.RIGHT, fill=tk.X, padx=0)

    def close_all_menus(self, event):
        for menu in self.menus:
            menu.hide()
        self.menudown = False

    def show_menu(self, show):
        for i in self.menus:
            if i.name != show.name:
                i.hide()

    def show_file_menu(self, event):
        self.menudown = True
        self.show_menu(self.file_menu)
        self.file_menu.show(event)

    def show_edit_menu(self, event):
        self.menudown = True
        self.show_menu(self.edit_menu)
        self.edit_menu.show(event)

    def show_view_menu(self, event):
        self.menudown = True
        self.show_menu(self.view_menu)
        self.view_menu.show(event)
    
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

    def dragwin(self,event):
        x = self._root.winfo_pointerx() - self._offsetx
        y = self._root.winfo_pointery() - self._offsety
        self._root.geometry(f"+{x}+{y}")

    def clickwin(self,event):
        self._offsetx = event.x
        self._offsety = event.y

    def rootmotion(self, event):
        x = event.x
        y = event.y + 35

        for i in self.menus:
            i.geometry("+%d+%d" % (x, y))


class EditorWindow(tk.Frame):
    def __init__(self, _root, *args, **kwargs):
        super().__init__(_root, *args, **kwargs)
        self._root = _root

        self.editor = tk.Text(self)
        self.editor.configure(bg="#62686f")

        self.editor_scrollbar = tk.Scrollbar(self.editor)
        self.editor_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.editor_scrollbar.config(command=self.editor.yview, bd=0)

        self.editor.config(yscrollcommand=self.editor_scrollbar.set)
        self.editor.pack(fill=tk.BOTH, expand=True)


root = tk.Tk()
root.geometry("1000x700")
root.configure(background="#007acc", bd=0)

root.update_idletasks()
root.overrideredirect(True)

topbar = MenuBar(root, bg="#dddddd", bd=0)
topbar.pack(side=tk.TOP, fill=tk.X)
root.config(menu=topbar)

editorwindow = EditorWindow(root)
editorwindow.pack(side=tk.BOTTOM, fill=tk.BOTH, expand=True)

editorwindow.bind('<Button-1>', topbar.close_all_menus)
editorwindow.editor.bind('<Button-1>', topbar.close_all_menus)

editorwindow.editor.unbind("<B1-Motion>")

root.mainloop()

# 🗕 🗖 ✖ ✕