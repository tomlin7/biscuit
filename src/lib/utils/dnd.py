import tkinter as tk
from tkinter import ttk
import tkinterDnD

root = tkinterDnD.Tk()  
root.title("example")

stringvar = tk.StringVar()
stringvar.set('Drop \'em here')

def drop(event):
    print(event.data)

label_2 = ttk.Label(root, ondrop=drop,
                    textvar=stringvar, padding=100, relief="solid")
label_2.pack(fill="both", expand=True, padx=10, pady=10)


root.mainloop()
