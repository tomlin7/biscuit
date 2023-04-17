import tkinter as tk


class Searchbar(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master

        # border
        self.config(bg="#007fd4")
        
        self.text_variable = tk.StringVar()
        
        frame = tk.Frame(self, bg="#FFFFFF")
        frame.pack(fill=tk.BOTH, padx=1, pady=1)
        
        self.search_bar = tk.Entry(
            frame, font=("Segoe UI", 10), fg="#616161", 
            width=self.master.width, relief=tk.FLAT, bg="#FFFFFF",
            textvariable=self.text_variable)
        
        self.search_bar.grid(sticky=tk.EW, padx=5, pady=5)
        self.configure_bindings()

    def configure_bindings(self):
        self.search_bar.bind("<Key>", self.filter)
        self.search_bar.bind("<Return>", self.master.search_bar_enter)

        self.search_bar.bind("<Down>", lambda e: self.master.select(1))
        self.search_bar.bind("<Up>", lambda e: self.master.select(-1))
    
    def clear(self):
        self.text_variable.set("")
    
    def focus(self):
        self.search_bar.focus()
    
    def add_prompt(self, prompt):
        self.text_variable.set(prompt)
        self.search_bar.icursor(tk.END)
    
    def get_search_term(self):
        return self.search_bar.get().lower()
    
    def filter(self, *args):
        term = self.get_search_term()

        prompt_found = False
        for actionset in self.master.actionsets:
            if term.startswith(actionset.prompt):
                self.master.pick_actionset(actionset)
                term = term[len(actionset.prompt):]
                prompt_found = True
        
        term = self.get_search_term()
        if not prompt_found:
            self.master.pick_file_search()
        
        new = [i for i in self.master.get_items() if str(i).startswith(term)]
        new += [i for i in self.master.get_items() if term in str(i) and i not in new]
        
        if any(new):
            self.master.show_items(new)
        else:
            self.master.show_no_results()
