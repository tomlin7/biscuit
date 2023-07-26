from biscuit.core.components.views import PanelView, SidebarView

from .endpoint import Endpoint


class Editors(Endpoint):
    def __init__(self, *a):
        super().__init__(*a)        
        self.__editors = self._Endpoint__base.editorsmanager 

        self.PanelView = PanelView
        self.SidebarView = SidebarView
    
        self.theme = self.__base.theme

    def add_editor(self, editor):
        self.__editors.add_editor(editor)
    
    def open_editor(self, path=None, exists=True):
        self.__editors.open_editor(path, exists)

    def open_diff_editor(self, path, exists):
        self.__editors.open_diff_editor(path, exists)
    
    def refresh(self):
        self.__editors.refresh()
    
    def active_editor(self):
        return self.__editors.active_editor

    def set_active_editor(self, editor):
        self.__editors.set_active_editor(editor)
    
    def close_editor(self, editor):
        self.__editors.close_editor(editor)

    def close_active_editor(self):
        self.__editors.close_active_editor()
