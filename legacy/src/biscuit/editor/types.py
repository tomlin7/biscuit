from __future__ import annotations

import os
import typing

from biscuit.common import is_image

from ..git.diff import DiffEditor
from .html import HTMLEditor
from .image import ImageViewer
from .markdown import MDEditor
from .text import TextEditor

if typing.TYPE_CHECKING:
    from .editorbase import BaseEditor


class EditorTypes:
    def __init__(self, base):
        self.base = base
        self._types = {}

    def register(self, editor_type: BaseEditor):
        self._types[editor_type.name] = editor_type

    def get(self, name):
        return self._types.get(name)

    def get_all(self):
        return self._types.values()

    def get_names(self):
        return self._types.keys()

    def get_default(self):
        return self.get("text")

    def get_editor(
        self,
        master,
        path="",
        exists=True,
        path2="",
        diff=False,
        language="",
        load_file=True,
        standalone=False,
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
            return DiffEditor(master, path, exists, path2, standalone=standalone)

        if path and os.path.isfile(path):
            if is_image(path):
                return ImageViewer(master, path)
            if any(
                path.endswith(i) for i in (".md", ".markdown", ".mdown", ".rst", ".mkd")
            ):
                return MDEditor(master, path, exists=exists)
            if path.endswith(".html") or path.endswith(".htm"):
                return HTMLEditor(master, path, exists=exists)

            return TextEditor(
                master, path, exists, language=language, load_file=load_file
            )

        return TextEditor(master, exists=exists, language=language, load_file=False)
