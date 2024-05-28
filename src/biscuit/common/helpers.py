"""Helper functions for the core components."""

import inspect
import os
import subprocess as sp
import webbrowser
from tkinter import messagebox

import filetype


def show_python_not_installed_message():
    messagebox.showerror(
        "Python not found",
        "Python is not installed on your system/not in PATH.\n\nBiscuit require Python to be installed. Please install Python and try again.",
    )
    webbrowser.open("https://www.python.org/downloads/")
    exit(1)

def check_python_installation():
    try:
        if os.name == "nt":
            sp.check_call(["python", "--version"])
            reqs = sp.check_output(['pip', 'freeze'])
        else:
            sp.check_call(["python3", "--version"])
            reqs = sp.check_output(['python3', '-m', 'pip', 'freeze'])

        # install python language server
        if not "python-lsp-server".encode() in reqs:
            try:
                if os.name == "nt":
                    sp.check_call(['pip', 'install', 'python-lsp-server'])
                else:
                    sp.check_call(['python3', '-m', 'pip', 'install', 'python-lsp-server'])
            except sp.CalledProcessError:
                print("Install python extension to enable python language features.")
                
    except sp.CalledProcessError:
        show_python_not_installed_message()

def get_file_type(file_path):
    return filetype.guess(file_path)

def is_image(file_path):
    return filetype.is_image(file_path)

def search_google(query: str) -> None:
    webbrowser.open(f"https://www.google.com/search?q={query}")

def caller_name(skip=2):
    """
    Get the name of a caller in the format module.class.method

    `skip` specifies how many levels of stack to skip while getting caller
    name. skip=1 means "who calls me", skip=2 "who calls my caller" etc.

    An empty string is returned if skipped levels exceed stack height
    """
    
    stack = inspect.stack()
    start = 0 + skip
    if len(stack) < start + 1:
        return ''
    parentframe = stack[start][0]    

    name = []
    module = inspect.getmodule(parentframe)
    # modname can be None when frame is executed directly in console
    if module:
        name.append(module.__name__)
    # detect classname
    if 'self' in parentframe.f_locals:
        name.append(parentframe.f_locals['self'].__class__.__name__)

    del parentframe, stack

    return ".".join(name)
