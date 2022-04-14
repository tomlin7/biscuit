import tkinter as tk


class ActionBar(tk.Frame):
    def __init__(self, master, left_panes=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master
        self.left_panes = left_panes

        self.config(bg='#2c2c2c', relief=tk.FLAT, bd=0)
        self.active_pane = None

        for i in self.left_panes:
            btn = self.create_button(text=i.icon)
            self.bind_button(btn, i)

        self.settings_btn = tk.Menubutton(self)
        self.settings_btn.config(
            height=2, width=4, relief=tk.FLAT, text="\ueb51", font=("codicon", 20), 
            bg="#2c2c2c", fg="#7b7b7b", activebackground="#2c2c2c", activeforeground="#ffffff")
        self.settings_btn.pack(fill=tk.X, side=tk.BOTTOM)
    
    def remove_all_except(self, frame):
        for i in self.left_panes:
            if i != frame and i.active:
                i.toggle()
    
    def create_button(self, text):
        btn = tk.Menubutton(self)
        btn.config(
            height=2, width=4, relief=tk.FLAT, text=text, font=("codicon", 15), 
            bg="#2c2c2c", fg="#7b7b7b", activebackground="#2c2c2c", activeforeground="#ffffff")
        btn.pack(fill=tk.X, side=tk.TOP)
        
        return btn

    def bind_button(self, button, frame):
        button.bind('<Button-1>', lambda e: self.on_click(frame))

    def on_click(self, frame):
        self.remove_all_except(frame)
        frame.toggle()
        self.active_pane = frame
    
    def toggle_active_pane(self):
        if self.active_pane:
            self.active_pane.toggle()
