import tkinter as tk


class Sidebar(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)

        btn1 = tk.Menubutton(self, height=3, width=6, relief=tk.FLAT, text="A", font=("Consolas", 10), bg="#F8B195")
        btn1.pack(fill=tk.X, side=tk.TOP)
        btn2 = tk.Menubutton(self, height=3, width=6, relief=tk.FLAT, text="B", font=("Consolas", 10), bg="#F67280")
        btn2.pack(fill=tk.X, side=tk.TOP)
        btn3 = tk.Menubutton(self, height=3, width=6, relief=tk.FLAT, text="C", font=("Consolas", 10), bg="#C06C84")
        btn3.pack(fill=tk.X, side=tk.TOP)
        btn4 = tk.Menubutton(self, height=3, width=6, relief=tk.FLAT, text="D", font=("Consolas", 10), bg="#6C5878")
        btn4.pack(fill=tk.X, side=tk.TOP)
        btn5 = tk.Menubutton(self, height=3, width=6, relief=tk.FLAT, text="E", font=("Consolas", 10), bg="#355C7D")
        btn5.pack(fill=tk.X, side=tk.TOP)
