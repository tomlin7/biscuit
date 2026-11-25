from biscuit.common import Menu


class ActionMenu(Menu):
    """Action menu for the activity bar

    Action menus are used to display a menu in the activity bar"""

    def get_coords(self, *e) -> list[int, int]:
        return (
            self.master.winfo_rootx() + self.master.winfo_width(),
            self.master.winfo_rooty()
            + self.master.winfo_height()
            - self.winfo_height(),
        )
