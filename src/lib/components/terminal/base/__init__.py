import os, tempfile
import subprocess as sp

from .utils import threaded
from .text import Text, TextIndex

ALLOWED_KEYSYM = ('Left', 'Right')
AVOID_KEYSYM = ('Up', 'Down')
ALLOWED_STATE = ('Shift', 'Lock', 'Control', 'Mod1',
                 'Mod2', 'Mod3', 'Mod4', 'Mod5')
MS_DELAY = 1


class _TerminalFunctionality:
    """Internal class for Terminal widget."""

    @property
    def _limit_backspace(self):
        """Internal property, returns the 
        length for spaces allowed at insert line."""
        insert_idx = self.index("insert")

        def get_initial(char):
            return self.get(
                str(insert_idx.row) + '.0',
                str(insert_idx.row) + f'.{char}'
            )

        if get_initial(2) == "> ":
            return 2

        if get_initial(len(self._basename)) == self._basename:
            return len(self._basename)

    def _set_basename(self, insert_newline=False):
        """Internal function"""
        if (self.get('end-2c') == '\\'
                or self.get('end-1l', 'end-1c') == '> '
                or self.index('end-1l').row != self.index('insert').row):
            return "break"
        if insert_newline:
            self.insert('end', '\n')
        self.insert('end', self._basename)
        self.tag_add('basename', 'end-1l', 'end-2c')
        self.see('end')
        self.linebar.trigger_change_event()

    def _get_commands(self, _cmd=None, _input=None):
        """Internal function"""

        def initial_index(ln):
            """Internal function"""
            index_col = 0
            base_index = (
                str(self.index(f'end-{ln}l').row) +
                str('.') + str(len(self._basename)))
            if self._basename and self.get(f'end-{ln}l', base_index) == self._basename:
                index_col = len(self._basename)
            return str(max((self.index(f'end-{ln}l').row), 1)) + '.%s' % index_col

        ln = 1
        cmd = _cmd or self.get(initial_index(ln), 'end-1c')
        add_more = self.get('end-1l', 'end-1c') == '> '

        if cmd.strip() == '':
            return None, None

        if _input is not None:
            return cmd, _input

        while cmd[:2] == '> ':
            ln += 1
            cmd = self.get(initial_index(ln), 'end-1c')

        cmd_copy = cmd

        if cmd.find("<input>") != -1:
            _input = cmd.split('<input>')[-1].split('</input>')[0]
            cmd = cmd.replace(f"<input>{_input}</input>", "")

        cmd = cmd.replace("> ", "") if ln > 1 else cmd

        if cmd and cmd[-1] == '\\' or add_more:
            return None, None

        self._commands_list.append(cmd_copy)

        return cmd, _input

    def _update_output_line(self, tag, line, update=False):
        """Internal function"""
        before_index = self.index("end-1c")
        self['state'] = "normal"
        self.insert('end', line)
        self.tag_add(tag, before_index, self.index("insert"))
        if update:
            self.update()
        self['state'] = "disabled"
        self.see('end')
        self.mark_set('insert', 'end')

    @threaded
    def _run_on_return(self, evt=None, _cmd=None, _input=None):
        """Internal function"""
        # Setting command and input
        self._terminated = False
        cmd, _input = self._get_commands(_cmd, _input)
        if _cmd is not None:
            self.insert("end-1c", _cmd)

        self._prev_cmd_pointer = -1

        if cmd is None or cmd == '':
            return self._set_basename(True)
        if cmd in ['clear', 'cls']:
            return self._clear()
        if cmd.startswith('cd'):
            wd = os.getcwd()
            os.chdir(self._cwd)
            path = cmd.split()
            if len(path) > 1:
                path = path[1]
                if path.startswith('~'):
                    path = os.path.expanduser(path)
                path = os.path.abspath(path)
                if os.path.exists(path):
                    self._cwd = path
            os.chdir(wd)

        stdin = sp.PIPE
        _original_state = self['state']
        self._out, self._err = '', ''
        self.insert('end', '\n')
        self['state'] = 'disable'

        if _input is not None:
            stdin = tempfile.TemporaryFile()
            stdin.write(_input.encode())
            stdin.seek(0)

        with sp.Popen(cmd, stdout=sp.PIPE, stderr=sp.PIPE, stdin=stdin,
                   bufsize=1, universal_newlines=True,
                   shell=self.shell, cwd=self._cwd) as self._popen:
            for line in self._popen.stdout:
                self._out += line
                self._update_output_line('output', line, True)
            for line in self._popen.stderr:
                self._err += line
                self._update_output_line('error', line, True)
        self['state'] = _original_state

        if _input is not None:
            stdin.close()

        self._set_basename(self._terminated)

    def _set_initials(self, evt=None):
        """Internal function"""
        if (self.get('end-2c') == '\\'
                or self.get('end-1l', 'end-1c') == '> '):
            index = "end-1c" if self.get('end-2c') == '\\' else "end"
            self.insert(index, '\n')
            self.insert('end', '> ')

    def _ignore_keypress(self, evt=None):
        """Internal function"""
        insert_idx = self.index('insert')

        if ('basename' in self.tag_names(insert_idx)):
            return "break"

    def _on_return(self, evt=None):
        """Internal function.

        Event callback on return key press."""
        self._set_initials()
        self._run_on_return(evt)
        return 'break'

    def _on_keypress(self, evt=None):
        """Internal function.

        Event callback on any keybroad key press."""
        insert_idx = self.index('insert')

        try:
            if (self._ignore_keypress(evt)  # Avoid typing on basename and spacer
                        or ((insert_idx.column <= self._limit_backspace or False)
                            and evt.keysym == 'Left')  # Avoid to get on basename and spacer
                        # or (evt.keysym in AVOID_KEYSYM) # break if keysym not allowed
                        or (evt.keysym not in ALLOWED_KEYSYM
                            and insert_idx.row != self.index('end-1l').row)
                        or (evt.state == 8 and evt.keysym == 'v'
                            and insert_idx.row != self.index('end-1l').row)  # Allowing pasting
                ):
                return "break"
        except TypeError:
            return

    def _on_backspace(self, evt=None):
        """Internal function.

        Event callback on backspace key press."""
        insert_idx = self.index('insert')
        if (insert_idx.column <= self._limit_backspace
                or insert_idx.row != self.index('end-1c').row):
            return "break"

    def _reset(self, evt=None):
        """Internal function.

        Resets terminal and values"""
        self._clear()
        self._commands_list.clear()

    def _clear(self, evt=None):
        """Internal function

        Clear the terminal window"""
        self.delete("0.1", "end")
        return self._set_basename()

    def _on_cut(self, evt=None):
        """Internal function.

        Event "cut" callback."""
        return self._ignore_keypress(evt)

    def _on_paste(self, evt=None):
        """Internal function.

        Event "paste" callback."""
        return self._ignore_keypress(evt)

    def _on_click(self, evt=None):
        """Internal function.

        Event triggers on mouse clicks"""
        self._click_insert_index = self.index("insert")

    def _on_click_release(self, evt=None):
        """Internal function.

        Event triggers on mouse clicks Release"""
        self.mark_set("insert", self._click_insert_index)
        return "break"

    def _load_previous(self, evt=None):
        """Internal function

        Loads any od the previous command"""
        if evt.keysym not in AVOID_KEYSYM:
            return

        if getattr(self, '_prev_cmd_pointer', None) is None:
            self._prev_cmd_pointer = -1

        if evt.keysym == 'Up' and self._commands_list:
            index = len(self._commands_list) - 1
            self._prev_cmd_pointer -= 1
            self._prev_cmd_pointer = max(-index, self._prev_cmd_pointer)
        elif evt.keysym == 'Down' and self._commands_list:
            self._prev_cmd_pointer += 1
            self._prev_cmd_pointer = min(0, self._prev_cmd_pointer)
        elif not self._commands_list:
            return "break"

        last_line_start = TextIndex(self.index("end-1l"))
        line_count = 1
        while self.get(
                str(last_line_start.row) + '.0',
                str(last_line_start.row) + f'.{len(self._basename)}'
        ) != self._basename:
            line_count += 1
            last_line_start = TextIndex(self.index(f"end-{line_count}l"))

        last_line_start = TextIndex(
            str(last_line_start.line) + '.' + str(len(self._basename))
        )
        last_line_end = TextIndex(self.index("end"))
        # clears the last line
        self.delete(last_line_start, last_line_end)
        if self._prev_cmd_pointer != 0:
            self.insert('end', self._commands_list[self._prev_cmd_pointer])
            self.see('end')

        return "break"

    def _cancel(self, evt=None):
        """Internal function

        Cancels ongoing execution"""
        if (getattr(self, '_popen', None) is not None
                and self._popen.poll() is None):
            self._popen.terminate()
            self._terminated = True


class TerminalBase(Text, _TerminalFunctionality):

    def __init__(self, *ags, **kw):
        """Construct a terminal widget with the parent MASTER.

        STANDARD OPTIONS

            background, borderwidth, cursor,
            exportselection, font, foreground,
            highlightbackground, highlightcolor,
            highlightthickness, insertbackground,
            insertborderwidth, insertofftime,
            insertontime, insertwidth, padx, pady,
            relief, selectbackground,
            selectborderwidth, selectforeground,
            setgrid, takefocus,
            xscrollcommand, yscrollcommand,

        WIDGET-SPECIFIC OPTIONS

            autoseparators, height, maxundo,
            spacing1, spacing2, spacing3,
            state, tabs, undo, width, wrap,

        """
        kw['highlightthickness'] = kw.get('highlightthickness', 0)
        super().__init__(*ags, **kw)

        self._cwd = os.getcwd()
        self._basename = ''
        self._commands_list = []

        self.shell = False
        self.basename = "» "

        self.bind("<<Cut>>", self._on_cut, True)
        self.bind("<<Paste>>", self._on_paste, True)

        self.bind("<Return>", self._on_return, True)
        self.bind("<KeyPress>", self._on_keypress, True)
        self.bind("<KeyPress>", self._load_previous, True)
        self.bind('<BackSpace>', self._on_backspace, True)
        self.bind('<Button-1>', self._on_click, True)
        self.bind('<ButtonRelease-1>', self._on_click_release, True)
        self.bind('<Button-3>', self._on_click, True)
        self.bind('<ButtonRelease-3>', self._on_click_release, True)

        self.bind('<Command-k>', self._clear, True)
        self.bind('<Control-c>', self._cancel, True)

        self.tag_config('basename', foreground='pink')
        self.tag_config('error', foreground='#f14c4c')
        self.tag_config('output', foreground='darkgrey')

        self._set_basename()

    @property
    def basename(self):
        """Returns the basename."""
        return self._basename.rstrip()

    @basename.setter
    def basename(self, val):
        """Change the basename of the terminal."""
        if not val.endswith(' '):
            val += ' '
        for i in self.tag_ranges('basename'):
            start_index = TextIndex(i)
            end_index = TextIndex(
                str(start_index.line) + str('.') +
                str(start_index.char + len(self._basename)))
            text = self.get(start_index, end_index)
            if text == self._basename:
                self.delete(start_index, end_index)
                self.insert(start_index, val)
                self.tag_add('basename', start_index, end_index)
        self._basename = val

    def clear(self):
        """Clear the console."""
        self.delete('1.0', 'end')
        self._set_basename()

    def get_output(self):
        """Get output from the recent command. 

        Returns None if no command has run else 
        the function will return a dictionary 
        of error and output."""
        if self._out or self._err:
            return {
                "error": self._err,
                "output": self._out}

    def get_last_command(self):
        """Get last command if any"""
        if self._commands_list:
            return self._commands_list[-1]

    def get_all_commands(self):
        """Get all the executed commands"""
        return self._commands_list

    def run_command(self, cmd, give_input=None):
        """Run the command into the terminal."""
        self._run_on_return(_cmd=cmd, _input=give_input)

