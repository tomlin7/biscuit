import tkinter as tk

from .slot import Slot


class Slots(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base 

        self.config(width=100, bg='#2c2c2c')

        self.slots = []
        self.active_slot = None

    def add_slot(self, view):
        slot = Slot(self, view)
        slot.pack(fill=tk.Y)
        self.slots.append(slot)
    
    def set_active_slot(self, selected_slot):
        self.active_slot = selected_slot
        for slot in self.slots:
            if slot != selected_slot:
                slot.disable()
