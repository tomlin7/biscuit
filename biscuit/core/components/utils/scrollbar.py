from tkinter import ttk


class AutoScrollbar(ttk.Scrollbar):
    def set(self, low, high):
        if float(low) <= 0.0 and float(high) >= 1.0:
            self.grid_remove()
        else:
            self.grid()
        ttk.Scrollbar.set(self, low, high)
