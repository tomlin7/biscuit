import tkinter as tk


class Searchbar(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master

        # border
        self.config(bg="#ecb464")
        
        self.text_variable = tk.StringVar()
        self.text_variable.trace("w", self.filter) 
        
        frame = tk.Frame(self, bg="#FFFFFF")
        frame.pack(fill=tk.BOTH, padx=1, pady=1)
        
        self.search_bar = tk.Entry(
            frame, font=("Segoe UI", 10), fg="#616161", 
            width=self.master.width, relief=tk.FLAT, bg="#FFFFFF",
            textvariable=self.text_variable)
        
        self.search_bar.grid(sticky=tk.EW, padx=5, pady=5)
        self.configure_bindings()

    def configure_bindings(self):
        ...

    def clear(self):
        self.text_variable.set("")
    
    def focus(self):
        self.search_bar.focus()
    
    def get_search_term(self):
        return self.search_bar.get().lower()
    
    def filter(self, *args):
        term = self.get_search_term()

        new = [i for i in self.master.active_set if i[0].lower().startswith(term.lower())]
        new += [i for i in self.master.active_set if any([f.lower() in i[0].lower() or i[0].lower() in f.lower() and i not in new for f in term.lower().split()])]
        
        self.master.show_result(new)
