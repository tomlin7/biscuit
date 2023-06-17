import tkinter as tk
import re


class FinderReplacer:
    """A class to hold all the find/replace functionality
    it will have the following attributes:

       matchstring - the string that the user wants to find.
       replacestring - the string that the user wants to replace,
                       if the user just wants to search is None.
       matches - a dict of matches with position as key and match
                 object as value.
       current - the current position the user is interacting with
    """

    def __init__(self, parent, matchstring=None, replacestring=None):
        self.matchstring = matchstring
        self.replacestring = replacestring
        self.matches = None
        self.parent = parent
        self.parent.text.tag_configure("found", background="green")
        self.parent.text.tag_configure(
            "foundcurrent", background="orange")
        self.display()

    @property
    def text(self):
        return self.parent.text.get(1.0, tk.END)

    @property
    def current(self):
        if not self.parent.text.count("1.0", self.parent.text.index(tk.INSERT), "chars"):
            return 0
        else:
            return self.parent.text.count("1.0", self.parent.text.index(tk.INSERT), "chars")[0]

    def display(self):
        self.window = tk.Toplevel(self.parent)
        self.window.geometry("500x300")
        self.window.title("find & replace")
        self.window_ROWS = 5
        self.window_COLS = 3

        for i in range(self.window_ROWS):
            self.window.rowconfigure(i, minsize=35)
        for i in range(self.window_COLS):
            self.window.columnconfigure(i, minsize=30)
        self.find_tag = tk.Label(self.window, text="Find: ")
        self.find_entry = tk.Entry(self.window)
        self.replace_tag = tk.Label(self.window, text="Replace for:")
        self.replace_entry = tk.Entry(self.window)
        self.find_tag.grid(row=1, column=1)
        self.find_entry.grid(row=1, column=2)
        self.replace_tag.grid(row=2, column=1)
        self.replace_entry.grid(row=2, column=2)
        self.find_button = tk.Button(
            self.window, text="Highlight", command=self.find)
        self.find_button.grid(row=1, column=4)
        self.next_button = tk.Button(
            self.window, text="->", command=self.next_match)
        self.next_button.grid(row=1, column=5)
        self.prev_button = tk.Button(
            self.window, text="<-", command=self.prev_match)
        self.prev_button.grid(row=1, column=3)
        self.replace_button = tk.Button(
            self.window, text="Change it!", command=self.replace)
        self.replace_all_button = tk.Button(
            self.window, text="ALL", command=self.replace_all)
        self.replace_button.grid(row=2, column=4)
        self.replace_all_button.grid(row=2, column=5)
        self.window.protocol("WM_DELETE_WINDOW", self.on_close)

    def highlight_matches(self):
        self.parent.text.tag_remove("found", "1.0", "end")
        self.parent.text.tag_remove("foundcurrent", "1.0", "end")
        for pos, match in self.matches.items():
            start = match.start()
            end = match.end()
            self.parent.text.tag_add(
                "found", f"1.0+{start}c", f"1.0+{end}c")
        if self.is_on_match():
            self.highlight_current()

    def highlight_current(self):
        self.parent.text.tag_remove("foundcurrent", "1.0", "end")
        current = self.current
        match = self.matches[current]
        start = match.start()
        end = match.end()
        self.parent.text.tag_add(
            "foundcurrent", f"1.0+{start}c", f"1.0+{end}c")

    def get_find_input(self):
        if self.find_entry.get() == "":
            self.parent.text.tag_remove("found", "1.0", "end")
            self.parent.text.tag_remove("foundcurrent", "1.0", "end")
            return
        current = self.current
        self.matches = {}
        self.matchstring = self.find_entry.get()
        self.re_ = re.compile(self.matchstring)
        for match in self.re_.finditer(self.text):
            self.matches[match.start()] = match
        self.highlight_matches()
        self.parent.text.mark_set("insert", f"1.0 + {current}c")

    def find(self):
        self.get_find_input()
        self.parent.lift()
        self.parent.text.focus()

    def next_match(self):
        """Moves the editor focus to the next match"""
        if self.find_entry.get() != self.matchstring:
            self.get_find_input()
        matchpos = [i for i in sorted(self.matches.keys()) if i > self.current]
        if len(matchpos) > 0:
            next_index = f"1.0 + {matchpos[0]}c"
            self.parent.text.mark_set("insert", next_index)
            self.parent.text.see(next_index)
            self.highlight_current()
        elif len(self.matches) > 0:
            self.parent.text.mark_set("insert", "1.0")
            if self.is_on_match():
                self.highlight_current()
            else:
                self.next_match()
        self.parent.lift()
        self.parent.text.focus()

    def prev_match(self):
        """Moves the editor focus to the previous match"""
        if self.find_entry.get() != self.matchstring:
            self.get_find_input()
        matchpos = [i for i in sorted(self.matches.keys()) if i < self.current]
        if len(matchpos) > 0:
            next_index = f"1.0 + {matchpos[-1]}c"
            self.parent.text.mark_set("insert", next_index)
            self.parent.text.see(next_index)
            self.highlight_current()
        elif len(self.matches) > 0:
            self.parent.text.mark_set("insert", "end")
            self.prev_match()
        self.parent.lift()
        self.parent.text.focus()

    def replace(self):
        """replaces current (in focus) match, removing the match and writing the replace string"""
        self.replacestring = self.replace_entry.get()
        if self.find_entry.get() != self.matchstring:
            self.get_find_input()
        if self.is_on_match():
            match = self.matches[self.current]
            self.parent.text.delete(
                f"1.0 + {match.start()}c", f"1.0 + {match.end()}c")
            self.parent.text.insert(
                f"1.0 + {self.current}c", self.replacestring)
            self.get_find_input()
        self.parent.lift()
        self.parent.text.focus()

    def is_on_match(self):
        """tells if the editor is currently pointing to a match"""
        if self.current in self.matches.keys():
            return True
        else:
            return False

    def on_close(self):
        """removes the highlighting of the find string when the window is closed"""
        self.parent.text.tag_remove("found", "1.0", "end")
        self.parent.text.tag_remove("foundcurrent", "1.0", "end")
        self.window.withdraw()

    def replace_all(self):
        """replaces all occurences of the string for the replace string, it will even replace partial words."""
        self.get_find_input()
        nmatches = len(self.matches)
        current = self.current
        self.parent.text.mark_set("insert", "1.0")
        self.replace()
        for i in range(nmatches):
            self.next_match()
            self.replace()
        self.parent.text.mark_set("insert", f"1.0 + {current}c")

    def revive(self, event):
        """brings the window back"""
        if self.parent.text.tag_ranges(tk.SEL):
            selection = self.parent.text.get(tk.SEL_FIRST, tk.SEL_LAST)
            self.find_entry.delete("0", "end")
            self.find_entry.insert("0", selection)
            self.parent.text.mark_set("insert", tk.SEL_FIRST)
            self.get_find_input()

        self.window.deiconify()
        self.window.lift()
        self.find_entry.focus()


if __name__ == '__main__':

    class EditorMock(tk.Tk):
        def __init__(self, text=""):
            super().__init__()
            self.text = tk.Text(self)
            self.text.textw = self.text
            self.text.pack()
            self.text.insert(tk.END, text)
            self.findr = FinderReplacer(self)
            self.bind("<Control-s>", self.findr.revive)
            self.mainloop()


    
    e = EditorMock(text="""EMACS: The Extensible, Customizable Display Editor
You are reading about GNU Emacs, the GNU incarnation of the advanced, self-documenting, customizable, extensible editor Emacs. (The ‘G’ in GNU (GNU’s Not Unix) is not silent.)

We call Emacs advanced because it can do much more than simple insertion and deletion of text. It can control subprocesses, indent programs automatically, show multiple files at once, edit remote files like they were local files, and more. Emacs editing commands operate in terms of characters, words, lines, sentences, paragraphs, and pages, as well as expressions and comments in various programming languages.

Self-documenting means that at any time you can use special commands, known as help commands, to find out what your options are, or to find out what any command does, or to find all the commands that pertain to a given topic. See Help.

Customizable means that you can easily alter the behavior of Emacs commands in simple ways. For instance, if you use a programming language in which comments start with ‘<**’ and end with ‘**>’, you can tell the Emacs comment manipulation commands to use those strings (see Manipulating Comments). To take another example, you can rebind the basic cursor motion commands (up, down, left and right) to any keys on the keyboard that you find comfortable. See Customization.

Extensible means that you can go beyond simple customization and create entirely new commands. New commands are simply programs written in the Lisp language, which are run by Emacs’s own Lisp interpreter. Existing commands can even be redefined in the middle of an editing session, without having to restart Emacs. Most of the editing commands in Emacs are written in Lisp; the few exceptions could have been written in Lisp but use C instead for efficiency. Writing an extension is programming, but non-programmers can use it afterwards. See Preface in An Introduction to Programming in Emacs Lisp, if you want to learn Emacs Lisp programming.""")
