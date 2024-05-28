import tkinter as tk

from ..codicon import get_codicon
from .native import Frame, Menubutton


class Button(Menubutton):
    """A flat style button"""

    def __init__(self, master, text, command=lambda _: None, *args, **kwargs) -> None:
        super().__init__(master, text=text, *args, **kwargs)
        self.config(pady=5, font=("Segoi UI", 10), cursor="hand2", **self.base.theme.utils.button)
        self.set_command(command)

    def set_command(self, command) -> None:
        """Set the command for the button"""

        self.bind('<Button-1>', command)



class IconLabelButton(Frame):
    """Icon label button with both text and icon
    
    Args:
        text (str): Text to display on the button
        icon (str): Icon to display on the button
        callback (function): Function to call when the button is clicked
        iconside (str): Side to display the icon
        expandicon (bool): Expand the icon
        highlighted (bool): Highlight the button
        iconsize (int): Size of the icon
        icon_visible (bool): Initial state of the icon visibility"""
    
    def __init__(
            self, master, text=None, icon=None, callback=lambda *_: None, 
            iconside=tk.LEFT, expandicon=True, highlighted=False, iconsize=14,  
            icon_visible=True, padx=5, pady=1, *args, **kwargs
    ) -> None:
        super().__init__(master, padx=padx, pady=pady, *args, **kwargs)

        self.bg, self.fg, self.hbg, self.hfg = self.base.theme.utils.iconlabelbutton.values() if not highlighted else self.base.theme.utils.button.values()
        self.config(bg=self.bg)
        self.text = text
        self.icon = icon
        self.icon_visible = icon_visible
        self.callback = callback
        self.codicon = get_codicon(self.icon)

        if icon:
            self.icon_label = tk.Label(self, text=self.codicon if self.icon_visible else "    ", anchor=tk.E, 
                bg=self.bg, fg=self.fg, font=("codicon", iconsize), cursor="hand2")
            self.icon_label.pack(side=iconside, fill=tk.BOTH, expand=expandicon)

        if text:
            self.text_label = tk.Label(self, text=self.text, anchor=tk.W, pady=2,
                    bg=self.bg, fg=self.fg, font=("Segoe UI", 10), cursor="hand2")
            self.text_label.pack(side=iconside, fill=tk.BOTH, expand=True)

        self.config_bindings()
        self.visible = False

    def config_bindings(self) -> None:
        self.bind("<Enter>", self.on_enter)
        self.bind("<Leave>", self.on_leave)

        self.bind("<Button-1>", self.on_click)
        if self.text:
            self.text_label.bind("<Button-1>", self.on_click)
        if self.icon:
            self.icon_label.bind("<Button-1>", self.on_click)

    def on_enter(self, *_) -> None:
        self.config(bg=self.hbg)
        if self.text:
            self.text_label.config(bg=self.hbg, fg=self.hfg)
        if self.icon:
            self.icon_label.config(bg=self.hbg, fg=self.hfg)

    def on_leave(self, *_) -> None:
        self.config(bg=self.bg)
        if self.text:
            self.text_label.config(bg=self.bg, fg=self.fg)
        if self.icon:
            self.icon_label.config(bg=self.bg, fg=self.fg)

    def on_click(self, *_) -> None:
        self.callback()
    
    def toggle_icon(self) -> None:
        try:
            self.icon_label.config(text=self.codicon if not self.icon_visible else "    ")
            self.icon_visible = not self.icon_visible
        except Exception:
            pass

    def change_text(self, text) -> None:
        try:
            self.text_label.config(text=text)
        except Exception:
            pass

    def change_icon(self, icon) -> None:
        try:
            self.icon_label.config(text=icon)
        except Exception:
            pass
        
    def set_pack_data(self, **kwargs) -> None:
        self.pack_data = kwargs

    def get_pack_data(self):
        return self.pack_data

    def show(self) -> None:
        if not self.visible:
            self.visible = True
            self.pack(**self.get_pack_data())

    def hide(self) -> None:
        if self.visible:
            self.visible = False
            self.pack_forget()
