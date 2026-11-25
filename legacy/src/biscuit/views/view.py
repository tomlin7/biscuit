from biscuit.common.ui import Frame


class View(Frame):
    """Abstract class for creating a view."""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views)
