import tkinter as tk
from .utils import _bind


class TextIndex(str):
    """
    Internal class.
    """

    def __init__(self, index):
        """
        Index helper class for tkinter Text widget.

        The class give flexibility in getting row, 
        column values separate from index.
        """
        self._index = str(index)
        self._row, self._col = (None, None)
        if self._index != "None":
            self._row, self._col = self._index.split('.')

    @property
    def row(self):
        """
        Get row from index.
        """
        if self._row is not None:
            return int(self._row)
    r = line = row

    @property
    def column(self):
        """
        Get column from index.
        """
        if self._col is not None:
            return int(self._col)
    c = char = col = column

    def __str__(self):
        return str(self._index)

    def __repr__(self):
        return "<class '%s'>" % (self.__class__.__name__)


class LineNumberBar(tk.Canvas):
    """
    Number line bar for Text widget.
    """

    def __init__(self, master, cnf={}, **kw):
        kw = tk._cnfmerge((cnf, kw))
        self.previous_ln = None
        self._text = kw.pop('textwidget', None)
        self._padx = kw.pop('padx', 1)
        kw['width'] = kw.get('width', 40)
        kw['highlightthickness'] = kw.get('highlightthickness', 0)
        tk.Canvas.__init__(self, master=master, **kw)

    @property
    def text(self):
        """
        Active Text widget.
        """
        return self._text

    @text.setter
    def text(self, text_widget):
        """
        Set Text widget.
        """
        self._text = text_widget
        self['bg'] = self._text['background']
        self._text._orig = self._text._w + "_orig"
        self._text.tk.call("rename", self._text._w, self._text._orig)
        self._text.tk.createcommand(self._text._w, self._proxy)
        self._binds(setit=True, reset=True)

    def _proxy(self, *args):
        """
        Internal function.
        """
        try:
            result = self._text.tk.call((self._text._orig,) + args)
        except tk.TclError:
            return
        if (args[0] in ("insert", "replace", "delete") or
            args[0:3] == ("mark", "set", "insert") or
            args[0:2] == ("xview", "moveto") or
            args[0:2] == ("xview", "scroll") or
            args[0:2] == ("yview", "moveto") or
                args[0:2] == ("yview", "scroll")):
            self._text.event_generate("<<Change>>", when="tail")
        return result

    def trigger_change_event(self):
        """
        Call <<Change>> event manually in case event 
        is not triggered in special cases.
        """
        return self._text.event_generate("<<Change>>", when="tail")

    def _redraw(self, *args):
        """
        Internal function.
        """
        self.delete("all")
        i = self._text.index("@0,0")

        # (improvement): try use for loop to improve performance.
        while True:
            dline = self._text.dlineinfo(i)
            if dline is None:
                break
            y = dline[1]
            linenum = str(i).split(".")[0]
            x = self.winfo_width() - self._padx
            line = self.create_text(
                x, y, anchor='ne', text=linenum,
                fill=self._text['foreground'],
                tag=i, font=self._text['font'])
            self._select_line(i, line)
            i = self._text.index("%s+1line" % i)

    def _select_line(self, lineID, ln):
        """
        Select whole line by clicking on the line number.
        """
        # Bug where on start it selects a line above from the selected.
        # Made this a year ago (not the best approach)
        # NEED IMPROVEMENTS.
        def select(line):
            if self.previous_ln is not None:
                self.itemconfigure(
                    self.previous_ln, fill=self._text['foreground'])
            self.itemconfigure(ln, fill=self._text['selectbackground'])
            self._text.tag_remove('sel', '1.0', 'end')
            line = int(line.split('.')[0])
            self._text.tag_add('sel', str(float(line)), str(float(line+1)))
            self.previous_ln = ln
        self.tag_bind(lineID, "<Button-1>", lambda _, ln=lineID: select(ln))

    def _insert_num_highlight(self, *args):
        # (bug): doesn't work properly in selecting through keyboard.
        # (Attempt-fix): use `after` but them have to remove
        #               highlight from others.
        """
        Internal function.
        """
        ln = self.text.index('insert').split('.')[0] + '.0'
        s1 = self.text.index('sel.first').split('.')
        s2 = self.text.index('sel.last').split('.')

        if ['None'] not in (s1, s2):
            for i in range(int(s1[0]), int(s2[0])):
                self.itemconfig('%s.0' %
                                i, fill=self._text['selectbackground'])
        self.itemconfig(ln, fill=self._text['selectbackground'])

    def _binds(self, setit, reset=False):
        """
        Internal function.
        """
        if not setit:
            _bind(self._text,
                  dict(className='on_configure', sequence="<Configure>"),
                  dict(className='on_change_redraw', sequence="<<Change>>"),
                  dict(className='on_change_insert', sequence="<<Change>>"))
            if not reset:
                return

        _bind(self._text,
              dict(className='on_configure',
                   sequence="<Configure>", func=self._redraw),
              dict(className='on_change_redraw',
                   sequence="<<Change>>", func=self._redraw),
              dict(className='on_change_insert',
                   sequence="<<Change>>", func=self._insert_num_highlight))

    def destroy(self):
        if self._text and self._text.winfo_exists():
            self._binds(False)
        return super().destroy()


class Text(tk.Text):
    """
    Text widget with linebar functionality.
    """

    def __init__(self, master=None, **kw):
        self.frame = tk.Frame(master)
        tk.Text.__init__(self, self.frame, **kw)
        self._linebar = LineNumberBar(self.frame)
        self._linebar.text = self
        self.pack(side='right', fill='both', expand=True)
        text_meths = vars(Text).keys()
        methods = vars(tk.Pack).keys() | vars(
            tk.Grid).keys() | vars(tk.Place).keys()
        methods = methods.difference(text_meths)

        for m in methods:
            if m[0] != '_' and m != 'config' and m != 'configure':
                setattr(self, m, getattr(self.frame, m))

    @property
    def linebar(self):
        """
        Return linebar instance.
        """
        return self._linebar

    @linebar.setter
    def linebar(self, show):
        """
        Set linebar (True/False)
        """
        self._linebar._binds(setit=show)
        if not show:
            return self._linebar.pack_forget()
        self._linebar.pack(side='right', fill='y', expand=True)

    def index(self, index):
        """
        Return the `TextIndex` instance in the form line.char for INDEX.
        """
        return TextIndex(super().index(index))

    def __str__(self):
        return str(self.frame)
