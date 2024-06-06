import tkinter as tk

from PIL import Image, ImageTk

from .editor import BaseEditor


class ImageViewer(BaseEditor):
    """ImageViewer is a simple image viewer that displays images in a canvas.
    User can zoom in and out using the mouse wheel and reset the zoom using Ctrl+0."""

    def __init__(self, master, path, editable=False, *args, **kwargs) -> None:
        super().__init__(master, path, editable=editable, *args, **kwargs)
        self.exists = True

        self.original_image = Image.open(self.path)
        # self.original_image.thumbnail((700, 700), Image.LANCZOS)
        self.display_image = self.original_image.copy()
        self.photo = ImageTk.PhotoImage(self.display_image)
        self.canvas = tk.Canvas(
            self,
            width=self.photo.width(),
            height=self.photo.height(),
            bd=0,
            highlightthickness=0,
            **self.base.theme.editors
        )
        self.canvas.pack(fill=tk.BOTH, expand=True)

        self.bind_all("<MouseWheel>", self.zoom_image)
        self.bind_all("<Control-0>", self.reset_zoom)
        self.after(100, self.create_image)

    def create_image(self):
        print(self.canvas.winfo_width() // 2, self.canvas.winfo_height() // 2)
        self.canvas.create_image(
            self.canvas.winfo_width() // 2,
            self.canvas.winfo_height() // 2,
            anchor=tk.CENTER,
            image=self.photo,
        )

    def zoom_image(self, event: tk.Event):
        x, y = self.canvas.canvasx(event.x), self.canvas.canvasy(event.y)
        bbox = self.canvas.bbox(tk.ALL)
        if event.delta > 0:
            zoom_factor = 1.2
        else:
            zoom_factor = 1 / 1.2

        new_width = int(self.display_image.width * zoom_factor)
        new_height = int(self.display_image.height * zoom_factor)
        if new_width < 100 or new_height < 100 or new_width > 1000 or new_height > 1000:
            return

        new_image = self.original_image.copy().resize(
            (new_width, new_height), Image.LANCZOS
        )
        new_x = x - (x - bbox[0]) * zoom_factor
        new_y = y - (y - bbox[1]) * zoom_factor

        self.display_image = new_image
        self.photo = ImageTk.PhotoImage(self.display_image)
        self.canvas.delete("all")
        self.canvas.create_image(new_x, new_y, anchor=tk.NW, image=self.photo)

    def reset_zoom(self, event):
        self.display_image = self.original_image.copy()
        self.photo = ImageTk.PhotoImage(self.display_image)
        self.canvas.delete("all")
        self.canvas.create_image(0, 0, anchor=tk.NW, image=self.photo)
