from ..codicon import get_codicon
from .labels import Label
from .native import Menubutton


class Icon(Label):
    """Simple label using codicons"""

    def __init__(
        self, master, icon: str = "", iconsize: int = 14, *args, **kwargs
    ) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(font=("codicon", iconsize))
        self.set_icon(icon)

    def set_icon(self, icon: str) -> None:
        self.config(text=get_codicon(icon))

    def set_color(self, color: str) -> None:
        self.config(fg=color)


class IconButton(Menubutton):
    """Icon button using codicons"""

    def __init__(
        self,
        master,
        icon,
        event=lambda *_: ...,
        icon2=None,
        iconsize=14,
        highlighted=False,
        *args,
        **kwargs
    ) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(
            cursor="hand2",
            **(
                self.base.theme.utils.iconbutton
                if not highlighted
                else self.base.theme.utils.button
            )
        )
        self.icons = [icon, icon2]
        self.icon2 = icon2
        self.switch = False

        self.event = event
        self.config(text=get_codicon(icon), font=("codicon", iconsize))

        self.bind("<Button-1>", self.onclick)

    def set_callback(self, event) -> None:
        self.event = event

    def onclick(self, *args) -> None:
        try:
            self.event(*args)
        except:
            self.event()

        self.v_onclick()
        self.toggle_icon()

    def v_onclick(self) -> None: ...

    def set_icon(self, icon) -> None:
        self.config(text=get_codicon(icon))

    def toggle_icon(self) -> None:
        if not self.icon2:
            return

        self.switch = not self.switch
        self.config(text=get_codicon(self.icons[self.switch]))

    def reset_icon(self) -> None:
        self.switch = False
        self.config(text=get_codicon(self.icons[self.switch]))
