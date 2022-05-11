import tkinter as tk


class GitTreeToolbar(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        tk.Frame.__init__(self, master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.config(bg="#f3f3f3")
        self.grid_columnconfigure(0, weight=1)

        self.label = tk.Label(self)
        self.label.config(
            text="SOURCE CONTROL", font=("Segoe UI", 10), anchor=tk.W, 
            bg="#f3f3f3", fg="#6f6f6f")
        
        self.more_actions = tk.Menubutton(self)
        self.more_actions.config(
            text="\uea7c", bg="#f3f3f3", fg="#424242", font=("codicon", 12),
            width=2, activebackground="#e1e1e1", activeforeground="#424242")
        
        self.refresh = tk.Menubutton(self)
        self.refresh.config(
            text="\ueb37", bg="#f3f3f3", fg="#424242", font=("codicon", 12), 
            width=2, activebackground="#e1e1e1", activeforeground="#424242")
        
        self.commit = tk.Menubutton(self)
        self.commit.config(
            text="\ueab2", fg="#424242", bg="#f3f3f3", font=("codicon", 12), 
            width=2, activebackground="#e1e1e1", activeforeground="#424242")
        
        self.label.grid(row=0, column=0, sticky=tk.EW, padx=(25, 0))
        self.more_actions.grid(row=0, column=1)
        self.refresh.grid(row=0, column=2)
        self.commit.grid(row=0, column=3)
    
    def disable_tools(self):
        self.commit.grid_remove()
        self.refresh.grid_remove()
        self.more_actions.grid_remove()
    
    def enable_tools(self):
        self.commit.grid()
        self.refresh.grid()
        self.more_actions.grid()