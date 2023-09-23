from biscuit.core.components.utils import Frame


class View(Frame):
    """
    View is a container of content that can appear in the sidebar or panel
    """
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views)
