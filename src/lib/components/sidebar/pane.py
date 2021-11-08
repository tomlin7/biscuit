import tkinter as tk


class SidePane(tk.Frame):
    def __init__(self, master, active=False, before=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.active = active
        self.before = before

    def toggle(self):
        self.active = not self.active
        
        if self.active:
            self.master.add(self, before=self.before)
        else:
        	self.master.forget(self)