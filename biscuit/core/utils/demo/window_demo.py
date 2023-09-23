#https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowpos
#https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-showwindow

import tkinter as tk
from ctypes import windll
from tkinter import ttk


def set_appwindow():
    global hasstyle
    GWL_EXSTYLE=-20
    WS_EX_APPWINDOW=0x00040000
    WS_EX_TOOLWINDOW=0x00000080
    if not hasstyle:
        hwnd = windll.user32.GetParent(root.winfo_id())
        style = windll.user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
        style = style & ~WS_EX_TOOLWINDOW
        style = style | WS_EX_APPWINDOW
        res = windll.user32.SetWindowLongW(hwnd, GWL_EXSTYLE, style)
        root.withdraw()
        root.after(10, lambda:root.wm_deiconify())
        hasstyle=True

def get_pos(event):
    global xwin
    global ywin
    xwin = event.x
    ywin = event.y

def move_window(event):
    global previousPosition
    root.geometry(f'+{event.x_root - xwin}+{event.y_root - ywin}')
    previousPosition = [root.winfo_x(), root.winfo_y()]

def move_window_bindings(*args, status=True):
    if status == True:
        title_bar.bind("<B1-Motion>", move_window)
        title_bar.bind("<Button-1>", get_pos)
        title_name.bind("<B1-Motion>", move_window)
        title_name.bind("<Button-1>", get_pos)
    else:
        title_bar.unbind("<B1-Motion>")
        title_bar.unbind("<Button-1>")
        title_name.unbind("<B1-Motion>")
        title_name.unbind("<Button-1>")

def quit():
    root.destroy()

#reference: https://programtalk.com/python-examples/ctypes.windll.user32.ShowWindow/
def minimize(hide=False):
    hwnd = windll.user32.GetParent(root.winfo_id())
    windll.user32.ShowWindow(hwnd, 0 if hide else 6)

def maximizeToggle():
    global maximized
    global previousPosition
    if maximized == False:
        #maximize current window
        maximize_btn.config(text="❐")
        hwnd = windll.user32.GetParent(root.winfo_id())
        SWP_SHOWWINDOW = 0x40
        windll.user32.SetWindowPos(hwnd, 0, 0, 0, int(root.winfo_screenwidth()), int(root.winfo_screenheight()-48),SWP_SHOWWINDOW)
        maximized = True
        move_window_bindings(status=False)
    else:
        #restore down window
        maximize_btn.config(text="🗖")
        hwnd = windll.user32.GetParent(root.winfo_id())
        SWP_SHOWWINDOW = 0x40
        windll.user32.SetWindowPos(hwnd, 0, previousPosition[0], previousPosition[1], int(root.minsize()[0]), int(root.minsize()[1]),SWP_SHOWWINDOW)
        maximized = False
        move_window_bindings(status=True)


#---------------------------------
root = tk.Tk()
root.overrideredirect(True)

#window details
maximized = False
back_ground = "#2c2c2c"
dimension = (300, 300)
#------------------------------

if len(dimension) == 0:
    #default window dimension
    x = (root.winfo_screenwidth()/2)-(350/2)
    y = (root.winfo_screenheight()/2)-(250)
    root.geometry(f'350x150+{int(x)}+{int(y)}')
    root.minsize(350, 150)
    dimension = (350, 150)
    previousPosition = [int(x), int(y)]

else:
    x = (root.winfo_screenwidth()/2)-(dimension[0]/2)
    y = (root.winfo_screenheight()/2)-250
    root.geometry(f'{dimension[0]}x{dimension[1]}+{int(x)}+{int(y)}')
    root.minsize(dimension[0], dimension[1])
    previousPosition = [int(x), int(y)]




#title bar
title_bar = tk.Frame(root, bg=back_ground, bd=1,
                     highlightcolor=back_ground, 
                     highlightthickness=0)

#window title
title_window = "Untitled window"
title_name = tk.Label(title_bar, text=title_window, 
                     font="Arial 12", bg=back_ground, fg="white")

#minimize btn
minimize_btn = tk.Button(title_bar, text='🗕', bg=back_ground, padx=5, pady=2, 
                         bd=0, font="bold", fg='white', width=2,
                         activebackground="red",
                         activeforeground="white", 
                         highlightthickness=0, 
                         command=minimize)

#maximize btn
maximize_btn = tk.Button(title_bar, text='🗖', bg=back_ground, padx=5, pady=2, 
                         bd=0, font="bold", fg='white', width=2,
                         activebackground="red",
                         activeforeground="white", 
                         highlightthickness=0, 
                         command=maximizeToggle)

#close btn
close_button = tk.Button(title_bar, text='🗙', bg=back_ground, padx=5, pady=2, 
                         bd=0, font="bold", fg='white', width=2,
                         activebackground="red",
                         activeforeground="white", 
                         highlightthickness=0, 
                         command= quit)

#hover effect
minimize_btn.bind('<Enter>', lambda x: minimize_btn.configure(bg='#777777'))
minimize_btn.bind('<Leave>', lambda x: minimize_btn.configure(bg=back_ground))
maximize_btn.bind('<Enter>', lambda x: maximize_btn.configure(bg='#777777'))
maximize_btn.bind('<Leave>', lambda x: maximize_btn.configure(bg=back_ground))
close_button.bind('<Enter>', lambda x: close_button.configure(bg='red'))
close_button.bind('<Leave>',lambda x: close_button.configure(bg=back_ground))


#main area of the window
window = tk.Frame(root, bg="white", highlightthickness=1, highlightbackground=back_ground)

txt = tk.Label(window, bg='white', text="Prototype window").pack(anchor="center")

# pack the widgets
title_bar.pack(fill='x', side=tk.TOP)
title_name.pack(side='left', padx=5)
close_button.pack(side='right')
maximize_btn.pack(side=tk.RIGHT)
minimize_btn.pack(side=tk.RIGHT)
window.pack(fill='both', expand=True, side=tk.TOP)
move_window_bindings(status=True)


#ctype
hasstyle = False
root.update_idletasks()

root.mainloop()