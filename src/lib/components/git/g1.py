import git, os, threading

import tkinter as tk
import tkinter.ttk as ttk
import tkinter.filedialog as filedialog
import tkinter.messagebox as messagebox

from ttkbootstrap import Style

from PIL import Image, ImageTk

repo = None
root = tk.Tk()
root.geometry("500x300")

icon_img = Image.open('test.bmp')
icon_img = ImageTk.PhotoImage(icon_img)


# --------------------------

class BetterEntry(ttk.Entry):
    def __init__(self, master, placeholder, **kwargs):
        self.s = ttk.Style()
        self.s.configure('my.TEntry', foreground='black', font=(0, 0, 'normal'))
        self.s.configure('placeholder.TEntry', foreground='grey', font=(0, 0, 'bold'))

        super().__init__(master, style='my.TEntry', **kwargs)
        self.text = placeholder
        self.__has_placeholder = False

        self._add()

        self.bind('<FocusIn>', self._clear)
        self.bind('<FocusOut>', self._add)
        self.bind('<KeyRelease>',self._normal)

    def _clear(self, *args):
        if self.get() == self.text and self.__has_placeholder:
            self.delete(0, tk.END)
            self.configure(style='my.TEntry')
            self.__has_placeholder = False

    def _add(self, *args):
        if self.get() == '' and not self.__has_placeholder:
            self.configure(style='placeholder.TEntry')
            self.insert(0, self.text)
            self.icursor(0)
            self.__has_placeholder = True

    def _normal(self, *args):
        self._add()
        if self.get() == self.text and self.__has_placeholder:
            self.bind('<Key>', self._clear)
            self.icursor(-1)
        else:
            self.configure(style='my.TEntry')

    def acquire(self):
        if self.get() == self.text and self.__has_placeholder:
            return 'None'
        else:
            return self.get()

    def shove(self, index, string):
        self._clear()
        self.insert(index, string)

    def remove(self, first, last):
        if self.get() != self.text:
            self.delete(first, last)
            self._add()
        elif self.acquire() == self.text and not self.__has_placeholder:
            self.delete(first, last)
            self._add()

    def length(self):
        if self.get() == self.text and self.__has_placeholder:
            return 0
        else:
            return len(self.get())


class ChangesTree(ttk.Treeview):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        
        self.configure(columns=("fullpath"), displaycolumns='')
        
        # self.bind("<<TreeviewOpen>>", self.update_tree)
        # self.bind("<<TreeviewSelect>>", self.update_tree)
        self.bind('<Double-Button-1>', self.openfile)

    def openfile(self, event):
        item = self.focus()
        path = self.set(item, "fullpath")

    def clean_tree(self):
        self.delete(*self.get_children())

    def add_files(self, parent, changed_files):
        for file in changed_files:
            oid = self.insert(parent, tk.END, text=file, values=[os.path.abspath(file)])

    def add_tree(self, basename, files=None):
        oid = self.insert('', tk.END, text=basename, open=True) #, image=icon_img)
        if files:
            self.add_files(oid, files)

def is_git_repo(path):
    try:
        _ = git.Repo(path).git_dir
        return True
    except git.exc.InvalidGitRepositoryError:
        return False

def open_repo(directory):
    if os.path.isdir(directory) and is_git_repo(directory):
        repo = git.Repo(directory)
    else:
        messagebox.showerror("Error", "Invalid directory")
        return

    branch_name.config(text=f"Branch: {repo.active_branch}")

    untracked_files = repo.untracked_files
    staged_files = [item.a_path for item in repo.index.diff(None)]

    # text
    changes.delete(0.1, tk.END)


    print(f"Branches: {repo.branches}")

    for i in repo.index.diff(None):
        changes.insert(tk.END, str(i) + "\n\n")
        changes.insert(tk.END, str(i.b_mode) + "\n\n")

    changes.insert(tk.END, "◆ Staged\n  ")
    changes.insert(tk.END, "\n  ".join(staged_files))

    changes.insert(tk.END, "\n\n◇ Untracked\n  ")
    changes.insert(tk.END, "\n  ".join(untracked_files))
    
    # tree 🌳
    tree.clean_tree()
    tree.add_tree("Staged Changes", staged_files)
    tree.add_tree("Changes", untracked_files)

    # ui
    root.title(f"{repo.working_tree_dir}")

    browse.pack_forget()
    dir.pack_forget()

    branch_name.pack(side=tk.LEFT, fill=tk.X, expand=True, pady=1)
    close.pack(side=tk.RIGHT, pady=1)

def open_repo_browse():
    directory = filedialog.askdirectory()
    if directory:
        dir.delete(0, tk.END)
        dir.insert(0, directory)

        threading.Thread(target=open_repo, args=[directory]).start()
    
def open_repo_dir(event):
    threading.Thread(target=open_repo, args=[dir.get()]).start()

def close_repo():
    global repo
    repo = None

    root.title("tk")

    branch_name.pack_forget()
    close.pack_forget()

    browse.pack(side=tk.LEFT, pady=1, expand=False)
    dir.pack(side=tk.LEFT, fill=tk.X, expand=True, pady=1, padx=5)

    changes.delete(0.1, tk.END)
    tree.clean_tree()

style = Style(theme='cosmo')
style.configure('Sash', relief='flat', gripcount=15)

base = tk.PanedWindow(root, orient=tk.HORIZONTAL, bd=0, sashwidth=5)
base.pack(fill=tk.BOTH, expand=True)

left = tk.PanedWindow(base, orient=tk.VERTICAL, bd=0)
base.add(left)

right = tk.PanedWindow(base, orient=tk.VERTICAL, bd=0)
base.add(right)

s = ttk.Frame(right)
right.add(s)

# Open state
# +----------------------+
# |[browse] [----dir----]|
# +----------------------+
# |/   /    /    /    /  |
# |   /    /    /    /   |
# |  /    /    /    /    |
# | /    /  Text   /    /|
# |/    /    /    /    / |
# |    /    /    /    /  |
# |   /    /    /    /   |
# +----------------------+

# Closed state
# +----------------------+
# |[----branch----] [ X ]|
# +----------------------+
# |/   /    /    /    /  |
# |   /    /    /    /   |
# |  /    /    /    /    |
# | /    /  Text   /    /|
# |/    /    /    /    / |
# |    /    /    /    /  |
# |   /    /    /    /   |
# +----------------------+


browse = ttk.Button(s, text="Browse...", command=open_repo_browse)
browse.pack(side=tk.LEFT, pady=1, expand=False)

dir = BetterEntry(s, placeholder="path/to/repo...")
dir.pack(side=tk.LEFT, fill=tk.X, expand=True, pady=1, padx=5)
dir.bind('<Return>', open_repo_dir)

branch_name = ttk.Label(s, text="")
close = ttk.Button(s, text="×", style='Outline.TButton', command=close_repo)

sep = ttk.Separator(right, orient='horizontal')
right.add(sep, sticky=tk.EW, padx=5, pady=3)

changes = tk.Text(right, font=("Consolas", 10), wrap=tk.NONE)
right.add(changes, sticky=tk.NSEW)

tree = ChangesTree(left)
left.add(tree, sticky=tk.NSEW)
tree.heading("#0", text="Changes", anchor=tk.W)

# style = ttk.Style()
# style.layout("Treeview", [
#     ('Treeview.treearea', {'sticky': 'nswe'})
# ])



# style.configure('.', relief = 'flat', borderwidth = 0)

# --------------------------
root.mainloop()