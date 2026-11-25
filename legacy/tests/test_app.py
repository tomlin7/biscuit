import os
import pytest


@pytest.mark.skip(reason="Requires display/Tkinter mainloop")
class TestApp:
    def test_initialization(self, app_instance):
        assert app_instance is not None

    def test_window_setup(self, app_instance):
        app_instance.update_idletasks()
        assert True

    def test_directory_handling(self, app_instance):
        app_instance.open_directory(os.getcwd())
        assert app_instance.active_directory == os.getcwd()
        app_instance.close_active_directory()
        assert app_instance.active_directory is None

    def test_editor_handling(self, app_instance):
        app_instance.open_editor(__file__)
        assert app_instance.editorsmanager.active_editor is not None
        app_instance.close_active_editor()
        assert app_instance.editorsmanager.active_editor is None

    def test_git_handling(self, app_instance):
        app_instance.update_git_GUI()
        assert app_instance.git_found is False

    def test_settings_handling(self, app_instance):
        app_instance.open_settings()
        assert app_instance.editorsmanager.active_editor is not None
        app_instance.close_active_editor()
        assert app_instance.editorsmanager.active_editor is None
