import tkinter as tk


class TopRightPane(tk.PanedWindow):
    def __init__(self, parent, *args, **kwargs):
        super().__init__(parent, *args, **kwargs)

        self.t = tk.Text(self)
        self.t.configure(height=25, width=75)
        self.add(self.t)
