from src.biscuit.editor import Editor, ImageViewer, MDEditor, TextEditor
from src.biscuit.git import DiffEditor
from src.biscuit.views import NavigationDrawerView, PanelView

from .endpoint import Endpoint


class Editors(Endpoint):
    def __init__(self, *a) -> None:
        super().__init__(*a)
        self.editors = self.base.editorsmanager

        self.PanelView = PanelView
        self.SidebarView = NavigationDrawerView
        self.TextEditor = TextEditor
        self.MDEditor = MDEditor
        self.DiffEditor = DiffEditor
        self.ImageViewer = ImageViewer
        self.Editor = Editor

        self.theme = self.base.theme

    def add_editor(self, editor) -> None:
        self.editors.add_editor(editor)

    def open_editor(self, path=None, exists=True) -> None:
        self.editors.open_editor(path, exists)

    def open_diff_editor(self, path, exists) -> None:
        self.editors.open_diff_editor(path, exists)

    def refresh(self) -> None:
        self.editors.refresh()

    def active_editor(self):
        return self.editors.active_editor

    def set_active_editor(self, editor) -> None:
        self.editors.set_active_editor(editor)

    def close_editor(self, editor) -> None:
        self.editors.close_editor(editor)

    def close_active_editor(self) -> None:
        self.editors.close_active_editor()
