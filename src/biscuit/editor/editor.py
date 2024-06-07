import os
import tkinter as tk

from src.biscuit.common import is_image

from ..git.diff import DiffEditor
from .breadcrumbs import BreadCrumbs
from .editorbase import BaseEditor
from .html import HTMLEditor
from .image import ImageViewer
from .markdown import MDEditor
from .text import TextEditor


def get_editor(
    base,
    path: str = None,
    exists: bool = True,
    path2: str = None,
    diff: bool = False,
    language: str = None,
    standalone: bool = False,
) -> TextEditor | DiffEditor | MDEditor | ImageViewer:
    """Get the suitable editor based on the path, exists, diff values passed.

    Args:
        base: The parent widget
        path (str): The path of the file to be opened
        exists (bool): Whether the file exists
        path2 (str): The path of the file to be opened in diff, required if diff=True is passed
        diff (bool): Whether the file is to be opened in diff editor
        language (str): The language of the file

    Returns:
        TextEditor | DiffEditor | MDEditor | ImageViewer:
            The suitable editor based on the path, exists, diff values passed"""

    if diff:
        return DiffEditor(base, path, exists, path2, standalone=standalone)

    if path and os.path.isfile(path):
        if is_image(path):
            return ImageViewer(base, path)
        if any(
            path.endswith(i) for i in (".md", ".markdown", ".mdown", ".rst", ".mkd")
        ):
            return MDEditor(base, path, exists=exists)
        if path.endswith(".html") or path.endswith(".htm"):
            return HTMLEditor(base, path, exists=exists)

        return TextEditor(base, path, exists, language=language)

    return TextEditor(base, exists=exists, language=language)


class Editor(BaseEditor):
    """Editor widget

    This is the main editor widget that is used to open and edit any type of file.
    Such as text, markdown, html, image, git diff etc. It provides breadcrumbs for opened file.

    This widget acts as a container for the actual editor content.
    `Editor.content` is the actual underlying BaseEditor instance that is used to open the file.
    """

    def __init__(
        self,
        master,
        path: str = None,
        exists: bool = False,
        path2: str = None,
        diff: bool = False,
        language: str = None,
        standalone: bool = False,
        config_file: str = None,
        showpath: bool = True,
        preview_file_callback=None,
        open_file_callback=None,
        *args,
        **kwargs,
    ) -> None:
        """Editor widget

        Args:
            master: The parent widget
            path (str): The path of the file to be opened
            exists (bool): Whether the file exists
            path2 (str): The path of the file to be opened in diff, required if diff=True is passed
            diff (bool): Whether the file is to be opened in diff editor
            language (str): Use the `Languages` enum provided (eg. Languages.PYTHON, Languages.TYPESCRIPT)
                This is given priority while picking suitable highlighter. If not passed, guesses from file extension.
            config_file (str): path to the custom config (TOML) file, uses theme defaults if not passed
            showpath (bool): Whether to show the breadcrumbs for editor or not
            preview_file_callback (function): called when files in breadcrumbs-pathview are single clicked. MUST take an argument (path)
            open_file_callback (function): called when files in breadcrumbs-pathview are double clicked. MUST take an argument (path)
        """

        super().__init__(master, *args, **kwargs)

        self.path = path
        self.exists = exists
        self.path2 = path2
        self.diff = diff
        self.language = language
        self.standalone = standalone
        self.showpath = showpath
        self.config_file = config_file
        self.preview_file_callback = preview_file_callback
        self.open_file_callback = open_file_callback

        self.config(bg=self.base.theme.border)
        self.grid_columnconfigure(0, weight=1)

        self.content = get_editor(self, path, exists, path2, diff, language, standalone)
        self.filename = os.path.basename(self.path) if path else None
        if path and exists and self.showpath and not diff:
            self.breadcrumbs = BreadCrumbs(self, path)
            self.grid_rowconfigure(1, weight=1)
            self.breadcrumbs.grid(row=0, column=0, sticky=tk.EW, pady=(0, 1))
            self.content.grid(row=1, column=0, sticky=tk.NSEW)
        else:
            self.grid_rowconfigure(0, weight=1)
            self.content.grid(row=0, column=0, sticky=tk.NSEW)

    def save(self, path: str = None) -> None:
        """Save the content to the file

        Args:
            path (str, Optional): The path to save the content to. If not passed, uses the current path
        """

        self.content.save(path)

    def focus(self) -> None:
        """Focus the editor content"""

        self.content.focus()

    def __str__(self) -> str:
        return f"{self.content.__class__.__name__}({self.path})"
