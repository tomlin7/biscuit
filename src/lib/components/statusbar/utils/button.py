import tkinter as tk 


class SButton(tk.Menubutton):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)

        self.enabled = False
        self.config(padx=10, fg="#000000", activebackground="#4c4a48", activeforeground="#ffffff")

    def set_pack_data(self, **kwargs):
        self.pack_data = kwargs

    def get_pack_data(self):
        return self.pack_data

    def show(self):
        if not self.enabled:
            self.enabled = True
            self.pack(**self.get_pack_data())
    
    def hide(self):
        if self.enabled:
            self.enabled = False
            self.pack_forget()
    