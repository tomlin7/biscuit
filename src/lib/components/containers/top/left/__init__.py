import tkinter as tk


class TopLeftPane(tk.PanedWindow):
    def __init__(self, parent, *args, **kwargs):
        super().__init__(parent, *args, **kwargs)

        self.t = tk.Text(self)
        self.t.configure(height=25, width=25)
        self.add(self.t)
