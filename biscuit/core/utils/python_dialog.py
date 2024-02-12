import subprocess
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
        subprocess.check_call(["python", "--version"])
    except subprocess.CalledProcessError:
        show_python_not_installed_message()
