import tkinter as tk
from vendor.tkterminal import Terminal

root = tk.Tk()

terminal = Terminal(pady=5, padx=5, bg="black", fg="white", font=("Consolas", 20))

terminal.shell = True
terminal.pack(expand=True, fill='both')
root.mainloop()