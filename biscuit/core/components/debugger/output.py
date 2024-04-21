from biscuit.core.utils import Text, Toplevel


class DebuggerInfo(Toplevel):
    """A Toplevel window that displays information about the debugger."""

    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.title("Debugger Information")
        self.text_widget = Text(self, wrap='word', width=60, height=50)
        self.text_widget.config(font=self.base.settings.font, **self.base.theme.editors.text)
        self.text_widget.pack(fill='both', expand=True)
        self.withdraw()

        self.wm_protocol("WM_DELETE_WINDOW", self.withdraw)
    
    def clear(self):
        """Clear the output."""

        try:
            self.text_widget.delete('1.0', 'end')
        except:
            pass
            
    def show_variables(self, frame):
        """Show the local variables in the given frame.
        
        Args:
            frame (frame): The frame to show the local variables of."""
        
        locals_str = "Local Variables:\n"
        for var, val in frame.f_locals.items():
            locals_str += f"{var}: {val}\n"
        self.text_widget.insert('end', locals_str)

    def show_callstack(self, frame):
        """Show the call stack from the given frame.

        Args:
            frame (frame): The frame to show the call stack from."""
        
        callstack_str = "\nCall Stack:\n"
        while frame:
            callstack_str += f"{frame.f_code.co_name} at {frame.f_code.co_filename}, line {frame.f_lineno}\n"
            frame = frame.f_back
        self.text_widget.insert('end', callstack_str)
