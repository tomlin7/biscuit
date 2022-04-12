import tkinter as tk


class ToggleWidget(tk.Frame):
    def __init__(self, master, img=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
        self.img = img

        self.state = False
        self.hovered = False

        self.hbg = "#e1e1e1"
        self.bg = "#f3f3f3"

        self.image = tk.PhotoImage(data="""iVBORw0KGgoAAAANSUhEUgAAAAcAAAANC
        AYAAABlyXS1AAAACXBIWXMAAABfAAAAXwEqnu0dAAAAGXRFWHRTb2Z0d2FyZQB3d3cua
        W5rc2NhcGUub3Jnm+48GgAAAHZJREFUGJWFkLENQjEQQ1+yCTOk/ENRUFDRIEBCHzEFb
        EIXewr2yNFQIEg+1/rd2T4krSVd6EwGVsDG9rkHIOkkKUYXqLUeFwHbh08gdSz2wC6ld
        PsR38ADmPJgcwLui57/0w572r5Kit6HcmvtGRFzKWX7Lb4AhaddqGaZ7iQAAAAASUVOR
        K5CYII=""")
        self.image_toggled = tk.PhotoImage(data="""iVBORw0KGgoAAAANSUhEUgAAA
        AwAAAAGCAYAAAD37n+BAAAACXBIWXMAAABfAAAAXwEqnu0dAAAAGXRFWHRTb2Z0d2FyZ
        QB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAKxJREFUGJV9jCFOA1EURc+tYhVogv1/sIwtg
        m4Bg2AD7QpIMAQMhmXUkCIwqM6/MwJDF1FDJkjyMDMJQwLXnnOubD9GxHtVVXf8M9tXk
        o5nktaSrm3f/CWXUpbAPfAKQNM0p7Y/bD9ExOzX88r2ZyllDqARtG2bIuIJeO77/qKu6
        6+u624j4lLSIqX0MgmGtyNgA7wBe+AcOMs5b0dnEgzRoSRHxAFwknPe/eTfdaJLHIQZk
        jwAAAAASUVORK5CYII=""")
        
        self.imagew = tk.Label(self, image=self.image)
        self.imagew.config(bg=self.bg, relief=tk.FLAT, fg="#c5c5c5")
        self.imagew.grid(row=0, column=0, sticky=tk.NS)

        self.config(bg=self.bg, cursor="hand2", pady=10, padx=5)
        self.config_bindings()

    def config_bindings(self):
        self.bind("<Enter>", self.on_hover)
        self.bind("<Leave>", self.off_hover)
        self.bind("<Button-1>", self.toggle)
        self.imagew.bind("<Button-1>", self.toggle)

    def toggle(self, *args):
        self.state = not self.state
        if self.state:
            self.imagew.config(image=self.image_toggled)
            self.config(pady=30, padx=2)
        else:
            self.imagew.config(image=self.image)
            self.config(pady=10, padx=5)
        self.master.toggle_replace(self.state)
    
    def on_hover(self, *args):
        self.hovered = True
        self.imagew.config(bg=self.hbg)
        self.config(bg=self.hbg)

    def off_hover(self, *args):
        self.hovered = False
        self.imagew.config(bg=self.bg)
        self.config(bg=self.bg)
