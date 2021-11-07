import tkinter as tk


class Sidebar(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.config(width=50, bg='#FFFFFF', relief=tk.FLAT, borderwidth=2)

        btn1 = tk.Menubutton(self, height=3, width=6, relief=tk.FLAT, text="A", font=("Consolas", 10), bg="#DEDDDD", fg="#000000", activebackground="#A9A9A9", activeforeground="#45494c")
        btn1.pack(fill=tk.X, side=tk.TOP) #, pady=1)
        btn2 = tk.Menubutton(self, height=3, width=6, relief=tk.FLAT, text="B", font=("Consolas", 10), bg="#DEDDDD", fg="#000000", activebackground="#A9A9A9", activeforeground="#45494c")
        btn2.pack(fill=tk.X, side=tk.TOP) #, pady=1)
        btn3 = tk.Menubutton(self, height=3, width=6, relief=tk.FLAT, text="C", font=("Consolas", 10), bg="#DEDDDD", fg="#000000", activebackground="#A9A9A9", activeforeground="#45494c")
        btn3.pack(fill=tk.X, side=tk.TOP) #, pady=1)
        btn4 = tk.Menubutton(self, height=3, width=6, relief=tk.FLAT, text="D", font=("Consolas", 10), bg="#DEDDDD", fg="#000000", activebackground="#A9A9A9", activeforeground="#45494c")
        btn4.pack(fill=tk.X, side=tk.TOP) #, pady=1)
        btn5 = tk.Menubutton(self, height=3, width=6, relief=tk.FLAT, text="E", font=("Consolas", 10), bg="#DEDDDD", fg="#000000", activebackground="#A9A9A9", activeforeground="#45494c")
        btn5.pack(fill=tk.X, side=tk.TOP) #, pady=1)

        btn6 = tk.Menubutton(self, height=3, width=6, relief=tk.FLAT, text="F", font=("Consolas", 10), bg="#DEDDDD", fg="#000000", activebackground="#A9A9A9", activeforeground="#45494c")
        btn6.pack(fill=tk.X, side=tk.BOTTOM)
