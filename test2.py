import tkinter as tk


class FloatingWindow(tk.Tk):
    def __init__(self):
        super().__init__()
        self.overrideredirect(True)
        self.center()

        self.label = tk.Label(self, text="Grab one of the blue")
        self.label.pack(side="top", fill="both", expand=True)

        self.grip_se = tk.Label(self,bg='blue')
        self.grip_se.place(relx=1.0, rely=1.0, anchor="se")
        self.grip_se.bind("<B1-Motion>",lambda e, mode='se':self.OnMotion(e,mode))

        self.grip_e = tk.Label(self,bg='green')
        self.grip_e.place(relx=1.0, rely=0.5, anchor="e")
        self.grip_e.bind("<B1-Motion>",lambda e, mode='e':self.OnMotion(e,mode))
        
        self.grip_ne = tk.Label(self,bg='blue')
        self.grip_ne.place(relx=1.0, rely=0, anchor="ne")
        self.grip_ne.bind("<B1-Motion>",lambda e, mode='ne':self.OnMotion(e,mode))

        self.grip_n = tk.Label(self,bg='green')
        self.grip_n.place(relx=0.5, rely=0, anchor="n")
        self.grip_n.bind("<B1-Motion>",lambda e, mode='n':self.OnMotion(e,mode))

        self.grip_nw = tk.Label(self,bg='blue')
        self.grip_nw.place(relx=0, rely=0, anchor="nw")
        self.grip_nw.bind("<B1-Motion>",lambda e, mode='nw':self.OnMotion(e,mode))

        self.grip_w = tk.Label(self,bg='green')
        self.grip_w.place(relx=0, rely=0.5, anchor="w")
        self.grip_w.bind("<B1-Motion>",lambda e, mode='w':self.OnMotion(e,mode))

        self.grip_sw = tk.Label(self,bg='blue')
        self.grip_sw.place(relx=0, rely=1, anchor="sw")
        self.grip_sw.bind("<B1-Motion>",lambda e, mode='sw':self.OnMotion(e,mode))

        self.grip_s = tk.Label(self,bg='green')
        self.grip_s.place(relx=0.5, rely=1, anchor="s")
        self.grip_s.bind("<B1-Motion>",lambda e, mode='s':self.OnMotion(e,mode))

    def OnMotion(self, event, mode):
        abs_x = self.winfo_pointerx() - self.winfo_rootx()
        abs_y = self.winfo_pointery() - self.winfo_rooty()
        width = self.winfo_width()
        height= self.winfo_height()
        x = self.winfo_rootx()
        y = self.winfo_rooty()
        
        if mode == 'se' and abs_x >0 and abs_y >0:
                self.geometry("%sx%s" % (abs_x,abs_y)
                              )
                
        if mode == 'e':
            if height >0 and abs_x >0:
                self.geometry("%sx%s" % (abs_x,height)
                              )
        if mode == 'ne' and abs_x >0:
                y = y+abs_y
                height = height-abs_y
                if height >0:
                    self.geometry("%dx%d+%d+%d" % (abs_x,height,
                                                   x,y))
        if mode == 'n':
            height=height-abs_y
            y = y+abs_y
            if height >0 and width >0:
                self.geometry("%dx%d+%d+%d" % (width,height,
                                               x,y))
            
        if mode == 'nw':
            width = width-abs_x
            height=height-abs_y
            x = x+abs_x
            y = y+abs_y
            if height >0 and width >0:
                self.geometry("%dx%d+%d+%d" % (width,height,
                                               x,y))
        if mode == 'w':
            width = width-abs_x
            x = x+abs_x
            if height >0 and width >0:
                self.geometry("%dx%d+%d+%d" % (width,height,
                                               x,y))
        if mode == 'sw':
            width = width-abs_x
            height=height-(height-abs_y)
            x = x+abs_x
            if height >0 and width >0:
                self.geometry("%dx%d+%d+%d" % (width,height,
                                               x,y))
        if mode == 's':
            height=height-(height-abs_y)
            if height >0 and width >0:
                self.geometry("%dx%d+%d+%d" % (width,height,
                                               x,y))
            
        
    def center(self):
        width = 300
        height = 300
        screen_width = self.winfo_screenwidth()
        screen_height = self.winfo_screenheight()
        x_coordinate = (screen_width/2) - (width/2)
        y_coordinate = (screen_height/2) - (height/2)

        self.geometry("%dx%d+%d+%d" % (width, height,
                                       x_coordinate, y_coordinate))

app=FloatingWindow()
app.mainloop()