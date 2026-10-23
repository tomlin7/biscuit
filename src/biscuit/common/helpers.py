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
    """Check if python is installed."""

    try:
        if os.name == "nt":
            sp.check_call(["python", "--version"])
            # sp.Popen(["pip", "install", "python-lsp-server"])
        else:
            sp.check_call(["python3", "--version"])

    except (sp.CalledProcessError, FileNotFoundError):
        show_python_not_installed_message()


def get_file_type(file_path):
    """Get the type of the file.

    Args:
        file_path (str): path to the file
    """

    return filetype.guess(file_path)


def is_image(file_path):
    """Check if the file is an image.

    Args:
        file_path (str): path to the file
    """

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

    frame = inspect.currentframe()
    for _ in range(skip):
        if frame is None:
            return ""
        frame = frame.f_back

    name = []
    module_name = frame.f_globals.get("__name__")
    if module_name:
        name.append(module_name)
    # detect classname
    if "self" in frame.f_locals:
        name.append(frame.f_locals["self"].__class__.__name__)

    del frame

    return ".".join(name)


def caller_class_name(skip=2):
    """
    Get the name of the class of the caller.

    `skip` specifies how many levels of stack to skip while getting the caller's class.
    skip=1 means "who calls me", skip=2 "who calls my caller" etc.

    An empty string is returned if skipped levels exceed the stack height.
    """
    frame = inspect.currentframe()
    for _ in range(skip):
        if frame is None:
            return None
        frame = frame.f_back

    class_name = None

    # detect classname
    if "self" in frame.f_locals:
        class_name = frame.f_locals["self"].__class__.__name__

    del frame

    return class_name
