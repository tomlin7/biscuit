import tkinter as tk
from tkextrafont import Font

window = tk.Tk()
font = Font(file="codicon.ttf", size=150)
tk.Label(window, text="\ueaf0", font=font).pack()
window.mainloop()
