import tkinter as tk

root = tk.Tk()
root.geometry("500x500")

# sidebar
sidebar = tk.Frame(root, width=50, bg='#aa6f73', height=500, relief=tk.FLAT, borderwidth=2)
sidebar.pack(fill='y', side='left', anchor='nw')

btn1 = tk.Menubutton(sidebar, height=3, width=6, relief=tk.FLAT, text="A", font=("Consolas", 10), bg="#F8B195")
btn1.pack(fill=tk.X, side=tk.TOP)
btn2 = tk.Menubutton(sidebar, height=3, width=6, relief=tk.FLAT, text="B", font=("Consolas", 10), bg="#F67280")
btn2.pack(fill=tk.X, side=tk.TOP)
btn3 = tk.Menubutton(sidebar, height=3, width=6, relief=tk.FLAT, text="C", font=("Consolas", 10), bg="#C06C84")
btn3.pack(fill=tk.X, side=tk.TOP)
btn4 = tk.Menubutton(sidebar, height=3, width=6, relief=tk.FLAT, text="D", font=("Consolas", 10), bg="#6C5878")
btn4.pack(fill=tk.X, side=tk.TOP)
btn5 = tk.Menubutton(sidebar, height=3, width=6, relief=tk.FLAT, text="E", font=("Consolas", 10), bg="#355C7D")
btn5.pack(fill=tk.X, side=tk.TOP)

btn6 = tk.Menubutton(sidebar, height=3, width=6, relief=tk.FLAT, text="F", font=("Consolas", 10), bg="#66545e")
btn6.pack(fill=tk.X, side=tk.BOTTOM)

class LeftFrame(tk.Frame):
	def __init__(self, master, *args, **kwargs):
		super().__init__(master, *args, **kwargs)
		self.active = False
		self.pack_data = {'sticky': 'ns'}

	def add_pack_data(self, **kwargs):
		self.pack_data = kwargs
		print(self.pack_data)

	def toggle(self):
		self.active = not self.active

		if self.active:
			base.paneconfig(self.master, width=200)
			self.master.add(self, sticky=tk.NSEW)
		else:
			base.paneconfig(self.master, width=1)
			self.master.forget(self)

# +——+==========+=================+
# |——‖ /   /   /‖  /   /   /   /  ‖
# |——‖/   /   / ‖ /   /   /   /   ‖
# |——‖   /   /  ‖/   /   /   /   /‖
# |——‖  /LEFT   ‖   /  EDITOR   / ‖
# |——‖ / PANE  /‖  /   /PANE   /  ‖
# |  ‖/   /   / ‖ /   /   /   /   ‖
# |  ‖   /   /  ‖/   /   /   /   /‖
# |——‖  /   /   ‖   /   /   /   / ‖
# +——+==========+=================+

base = tk.PanedWindow(orient=tk.HORIZONTAL, bd=0)
base.pack(expand=True, fill=tk.BOTH, side=tk.TOP)

left = tk.PanedWindow(orient=tk.VERTICAL, bd=0, bg='#F8B195')
base.add(left, sticky=tk.NSEW, stretch="always")

right = tk.PanedWindow(orient=tk.HORIZONTAL, bd=0, bg='#F8B195')
base.add(right, sticky=tk.NSEW, stretch="always")

left1 = LeftFrame(left, bg='#FFFFFF')
t1 = tk.Label(left1, text="Hello world")
t1.pack(expand=True, fill='both', side='top')

left2 = LeftFrame(left, bg='#FFFFFF')
t2 = tk.Label(left2, text="Bye world")
t2.pack(expand=True, fill='both', side='top')

left3 = LeftFrame(left, bg='#FFFFFF')
t3 = tk.Label(left3, text="whatsup again")
t3.pack(expand=True, fill='both', side='top')

left4 = LeftFrame(left, bg='#FFFFFF')
t4 = tk.Label(left4, text="ok and")
t4.pack(expand=True, fill='both', side='top')

left5 = LeftFrame(left, bg='#FFFFFF')
t5 = tk.Label(left5, text="goway sho sho")
t5.pack(expand=True, fill='both', side='top')

left_frames = [left1, left2, left3, left4, left5]

# main content area
mainarea = tk.PanedWindow(right, bg='#F8B195')
right.add(mainarea, sticky=tk.NSEW)

main_txt = tk.Text(mainarea, bg='#F8B195', font=("Consolas", 20), bd=0)
mainarea.add(main_txt, sticky=tk.NSEW)

def remove_all_left_active(frame):
	for i in left_frames:
		if i != frame and i.active:
			i.toggle()

def print_active():
	print(f"Left Active: {[i for i in left_frames if i.active]}")

def b1(e):
	remove_all_left_active(left1)
	left1.toggle()
btn1.bind('<Button-1>', b1)

def b2(e):
	remove_all_left_active(left2)
	left2.toggle()
btn2.bind('<Button-1>', b2)

def b3(e):
	remove_all_left_active(left3)
	left3.toggle()
btn3.bind('<Button-1>', b3)

def b4(e):
	remove_all_left_active(left4)
	left4.toggle()
btn4.bind('<Button-1>', b4)

def b5(e):
	remove_all_left_active(left5)
	left5.toggle()
btn5.bind('<Button-1>', b5)


root.mainloop()