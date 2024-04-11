import subprocess as sp
import webbrowser
from tkinter import messagebox


def show_python_not_installed_message():
    messagebox.showerror(
        "Python not found",
        "Python is not installed on your system/not in PATH.\n\nBiscuit require Python to be installed. Please install Python and try again.",
    )
    webbrowser.open("https://www.python.org/downloads/")
    exit(1)

def check_python_installation():
    try:
        sp.check_call(["python", "--version"])
        reqs = sp.check_output(['pip', 'freeze'])

        # install python language server
        if not "python-lsp-server".encode() in reqs:
            try:
                sp.check_call(['pip', 'install', 'python-lsp-server'])
            except sp.CalledProcessError:
                print("Install python extension to enable python language features.")
    except sp.CalledProcessError:
        show_python_not_installed_message()
