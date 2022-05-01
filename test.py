import tkinter as tk

class CustomPanedWindow(tk.Frame):
    def __init__(self, parent):
        tk.Frame.__init__(self, parent)
        self.panes = []

    def add(self, widget, weight=1):
        '''Add a pane with the given weight'''
        self.panes.append({"widget": widget, "weight": weight})
        self.layout()

    def layout(self):
        for child in self.place_slaves():
            child.place_forget()

        total_weight = sum([pane["weight"] for pane in self.panes])
        rely= 0

        for i, pane in enumerate(self.panes):
            relheight = pane["weight"]/float(total_weight)
            # Note: relative and absolute heights are additive; thus, for 
            # something like 'relheight=.5, height=-1`, that means it's half
            # the height of its parent, minus one pixel. 
            if i == 0:
                pane["widget"].place(x=0, y=0, relheight=relheight, relwidth=1.0)
            else:
                # every pane except the first needs some extra space
                # to simulate a sash
                pane["widget"].place(x=0, rely=rely, relheight=relheight, relwidth=1.0, 
                                     height=-2, y=2)
            rely = rely + relheight

class Example(tk.Frame):
    def __init__(self, parent):
        tk.Frame.__init__(self, parent)

        paned = CustomPanedWindow(self)
        paned.pack(side="top", fill="both", expand=True)

        f1 = tk.Frame(self, background="red", width=200, height=200)
        f2 = tk.Frame(self, background="green", width=200, height=200)
        f3 = tk.Frame(self, background="blue", width=200, height=200)

        paned.add(f1, 1)
        paned.add(f2, 2)
        paned.add(f3, 4)

if __name__ == "__main__":
    root = tk.Tk()
    Example(root).pack(fill="both", expand=True)
    root.geometry("400x900")
    root.mainloop()