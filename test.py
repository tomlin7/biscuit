from tkinter import Tk

import pygments.lexers
from chlorophyll import CodeView

root = Tk()

codeview = CodeView(root, lexer=pygments.lexers.PythonLexer, color_scheme="monokai")
codeview.pack(fill="both", expand=True)

root.mainloop()