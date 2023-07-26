import tkinter as tk

from PIL import Image, ImageTk
from ..editor import BaseEditor


#TODO: zooming in and out
class ImageViewer(BaseEditor):
    def __init__(self, master, path, exists=True, *args, **kwargs):
        super().__init__(master, path, exists=True, editable=False, *args, **kwargs)
        self.open_image()

    def open_image(self):
        self.image = Image.open(self.path)
        self.image.thumbnail((500, 500))
        self.tk_image = ImageTk.PhotoImage(self.image)

        self.image_label = tk.Label(self, image=self.tk_image, **self.base.theme.editors)
        self.image_label.pack(fill=tk.BOTH, expand=True)
