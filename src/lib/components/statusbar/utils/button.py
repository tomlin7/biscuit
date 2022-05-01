import tkinter as tk


class SButton(tk.Frame):
    def __init__(self, master, text, icon=None, function=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.function = function or (lambda *_: None)

        self.bg = master.bg
        self.fg = master.fg
        self.hbg = master.hbg

        self.config(padx=5, bg=self.bg)
        self.text = text
        self.icon = icon

        if icon:
            self.icon_label = tk.Label(self, text=self.icon, anchor=tk.CENTER, 
                bg=self.master.bg, fg=self.master.fg, font=("codicon", 12))
            self.icon_label.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        self.text_label = tk.Label(self, text=self.text, anchor=tk.CENTER, pady=2,
                bg=self.master.bg, fg=self.master.fg, font=("Segoe UI", 9))
        self.text_label.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.config_bindings()
        self.visible = False

    def config_bindings(self):
        self.bind("<Enter>", self.on_enter)
        self.bind("<Leave>", self.on_leave)
        
        self.bind("<Button-1>", self.on_click)
        self.text_label.bind("<Button-1>", self.on_click)
        if self.icon:
            self.icon_label.bind("<Button-1>", self.on_click)

    def on_enter(self, _):
        self.config(bg=self.hbg)
        self.text_label.config(bg=self.hbg)
        if self.icon:
            self.icon_label.config(bg=self.hbg)

    def on_leave(self, _):
        self.config(bg=self.bg)
        self.text_label.config(bg=self.bg)
        if self.icon:
            self.icon_label.config(bg=self.bg)

    def on_click(self, _):
        self.function()

    def change_text(self, text):
        self.text_label.config(text=text)
    
    def change_icon(self, icon):
        self.icon_label.config(text=icon)

    def set_pack_data(self, **kwargs):
        self.pack_data = kwargs

    def get_pack_data(self):
        return self.pack_data

    def show(self):
        if not self.visible:
            self.visible = True
            self.pack(**self.get_pack_data())
    
    def hide(self):
        if self.visible:
            self.visible = False
            self.pack_forget()
