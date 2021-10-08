import tkinter as tk


class Text(tk.Text):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.data = None

    def load_file(self, path):
        with open(path, 'r') as data:
            self.data = data.read()
            self.clear_insert()

    def clear_insert(self):
        self.clear()
        self.write(text=self.data)
        
    def clear(self):
        self.delete(1.0, tk.END)

    def write(self, text):
        self.insert(tk.END, text)