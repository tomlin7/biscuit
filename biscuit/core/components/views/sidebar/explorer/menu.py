from biscuit.core.components.floating import Menu


class ExplorerMenu(Menu):
    def get_coords(self, e):
        return e.widget.winfo_rootx(), e.widget.winfo_rooty() + e.widget.winfo_height()

class ExplorerContextMenu(Menu):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.add_item("New file...", self.master.new_file)
        self.add_item("New Folder...", self.master.new_folder)
        self.add_item("Reveal in File Explorer", self.master.reveal_in_explorer)
        self.add_item("Open in Integrated Terminal", self.master.open_in_terminal)
        # self.add_separator()
        # self.add_item("Copy", self.master.new_file)
        # self.add_item("Cut", self.master.new_file)
        # self.add_item("Paste", self.master.new_file)
        self.add_separator()
        self.add_item("Copy Path")
        self.add_item("Copy Relative Path")
        self.add_separator()
        self.add_item("Rename...")
        self.add_item("Delete")
        
    def get_coords(self, e):
        return e.x_root, e.y_root
    
    def show(self, *e):
        super().show(*e)
