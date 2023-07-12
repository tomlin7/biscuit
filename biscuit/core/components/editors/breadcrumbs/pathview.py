from core.components.views.sidebar.explorer import DirectoryTree
from core.components.utils import Toplevel


class PathView(Toplevel):
    def __init__(self, master, width=150, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.width = round(width * self.base.scale)
        
        self.tree = DirectoryTree(self, width=width, observe_changes=False, itembar=False)
        self.tree.pack()

        self.config(pady=1, padx=1, bg=self.base.theme.border)
        self.overrideredirect(True)
        self.withdraw()

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)
        self.configure_bindings()

    def configure_bindings(self):
        self.bind("<FocusOut>", self.hide)
        self.bind("<Escape>", self.hide)
    
    def get_popup_x(self, width):
        return self.winfo_rootx() + int(self.winfo_width() / 2) - int(width / 2)

    def get_popup_y(self):
        return self.winfo_rooty()
    
    def hide(self, *_):
        self.withdraw()
        
    def show(self, e):
        self.update_idletasks()
        w = e.widget
        x = w.winfo_rootx()
        y = w.winfo_rooty() + w.winfo_height()
        
        self.tree.change_path(w.path)
        self.geometry(f"+{x}+{y}")
        self.deiconify()
        self.focus_set()
        
