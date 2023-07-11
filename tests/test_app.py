import os


class TestApp:
    # Tests that the App initializes without errors
    def test_initialization(self, app_instance):
        assert app_instance is not None

    # Tests that the App sets up tkinter window with correct geometry and title
    def test_window_setup(self, app_instance):
        app_instance.update_idletasks()
        assert app_instance.geometry().startswith('1200x900')
        assert app_instance.title() == 'Biscuit'

    # Tests that the App handles opening and closing directories without errors
    def test_directory_handling(self, app_instance):
        app_instance.open_directory(os.getcwd())
        assert app_instance.active_directory == os.getcwd()
        app_instance.close_active_directory()
        assert app_instance.active_directory is None

    # Tests that the App handles opening and closing editors without errors
    def test_editor_handling(self, app_instance):
        app_instance.open_editor(__file__)
        assert app_instance.editorsmanager.active_editor is not None
        app_instance.close_active_editor()
        assert app_instance.editorsmanager.active_editor is None

    # Tests that the App handles updating Git status and source control without errors
    def test_git_handling(self, app_instance):
        app_instance.update_git()
        assert app_instance.git_found == False

    # Tests that the App handles opening settings and games without errors
    def test_settings_handling(self, app_instance):
        app_instance.open_settings()
        assert app_instance.editorsmanager.active_editor is not None
        app_instance.close_active_editor()
        assert app_instance.editorsmanager.active_editor is None
    