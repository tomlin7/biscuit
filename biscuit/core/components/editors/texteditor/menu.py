from biscuit.core.components.floating import Menu


class RunMenu(Menu):
    def get_coords(self, e) -> list:
        return e.widget.winfo_rootx() + e.widget.winfo_width() - self.winfo_width(), e.widget.winfo_rooty() + e.widget.winfo_height()
