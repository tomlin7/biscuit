from biscuit.common import Menu


class GitHubMenu(Menu):
    def get_coords(self, e) -> list:
        return e.widget.winfo_rootx(), e.widget.winfo_rooty() + e.widget.winfo_height()
