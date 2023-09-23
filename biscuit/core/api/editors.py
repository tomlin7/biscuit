from biscuit.core.components.views import PanelView, SidebarView

from .endpoint import Endpoint


class Editors(Endpoint):
    def __init__(self, *a) -> None:
        super().__init__(*a)        
        self.__editors = self._Endpoint__base.editorsmanager 

        self.PanelView = PanelView
        self.SidebarView = SidebarView
    
        self.theme = self.__base.theme

    def add_editor(self, editor) -> None:
        self.__editors.add_editor(editor)
    
    def open_editor(self, path=None, exists=True) -> None:
        self.__editors.open_editor(path, exists)

    def open_diff_editor(self, path, exists) -> None:
        self.__editors.open_diff_editor(path, exists)
    
    def refresh(self) -> None:
        self.__editors.refresh()
    
    def active_editor(self):
        return self.__editors.active_editor

    def set_active_editor(self, editor) -> None:
        self.__editors.set_active_editor(editor)
    
    def close_editor(self, editor) -> None:
        self.__editors.close_editor(editor)

    def close_active_editor(self) -> None:
        self.__editors.close_active_editor()
