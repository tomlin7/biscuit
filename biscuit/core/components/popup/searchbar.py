import tkinter as tk


class Searchbar(tk.Frame):
    def __init__(self, master, prompt, watermark, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.prompt = prompt
        self.watermark = watermark

        # border
        self.config(bg="#007fd4")
        
        self.init_text_variable()
        self.init_searchbar()
        self.bind_search_bar()

    def init_text_variable(self):
        self.text_variable = tk.StringVar()
        self.text_variable.set(self.prompt)

    def init_searchbar(self):
        self.search_bar_frame = frame = tk.Frame(self, bg="#FFFFFF")
        frame.pack(fill=tk.BOTH, padx=1, pady=1)
        
        self.search_bar = tk.Entry(
            frame, font=("Segoe UI", 10), fg="#616161", 
            width=self.master.width, relief=tk.FLAT, bg="#FFFFFF",
            textvariable=self.text_variable)
        
        self.search_bar.grid(sticky=tk.EW, padx=5, pady=5)
        self.add_prompt()
        
    def bind_search_bar(self):
        self.search_bar.bind("<KeyRelease>", self.filter)
        self.search_bar.bind("<Return>", self.master.search_bar_enter)

        self.search_bar.bind("<Down>", lambda e: self.master.select(1))
        self.search_bar.bind("<Up>", lambda e: self.master.select(-1))
    
    def clear(self):
        self.add_prompt()
    
    def focus(self):
        self.search_bar.focus()
    
    def add_prompt(self):
        self.text_variable.set(self.prompt)
        self.search_bar.icursor(tk.END)
    
    def get_search_term(self):
        return self.search_bar.get().lower()[len(self.prompt):]
    
    def filter(self, *args):
        term = self.get_search_term()
        self.master.hide_all_items()

        new = [i for i in self.master.get_items_text() if i[0].startswith(term)]
        new += [i for i in self.master.get_items_text() if term in i[0] and i not in new]
        
        if any(new):
            self.master.show_items(new, term)
        else:
            self.master.show_no_results()