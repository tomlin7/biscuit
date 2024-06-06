from src.biscuit.common import Menu


class ExplorerMenu(Menu):
    def get_coords(self, e) -> list:
        return e.widget.winfo_rootx(), e.widget.winfo_rooty() + e.widget.winfo_height()


class ExplorerContextMenu(Menu):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.add_command("New file...", lambda: self.base.palette.show("newfile:"))
        self.add_command("New Folder...", lambda: self.base.palette.show("newfolder:"))
        self.add_command("Reveal in File Explorer", self.master.reveal_in_explorer)
        self.add_command("Open in Integrated Terminal", self.master.open_in_terminal)
        self.add_command("Reopen editor", self.master.reopen_editor)
        # self.add_separator()
        # self.add_command("Copy", self.master.new_file)
        # self.add_command("Cut", self.master.new_file)
        # self.add_command("Paste", self.master.new_file)
        self.add_separator()
        self.add_command("Copy Path", self.master.copy_path)
        self.add_command("Copy Relative Path", self.master.copy_relpath)
        self.add_separator()
        self.add_command("Rename...", lambda: self.base.palette.show("rename:"))
        self.add_command("Delete", self.master.delete_item)

    def get_coords(self, e) -> list:
        return e.x_root, e.y_root

    def show(self, *e) -> None:
        super().show(*e)
