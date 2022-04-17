import tkinter as tk

from PIL import ImageTk, Image

#TODO: zooming in and out
class ImageViewer(tk.Frame):
    def __init__(self, master, path, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.path = path
        self.open_image()

    def open_image(self):
        self.image = Image.open(self.path)
        self.image.thumbnail((500, 500))
        self.tk_image = ImageTk.PhotoImage(self.image)

        self.image_label = tk.Label(self, image=self.tk_image)
        self.image_label.pack(fill=tk.BOTH, expand=True)
