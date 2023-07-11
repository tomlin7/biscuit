import os
from biscuit import App
from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv('.env'))

app = App()

class TestApp:
    # Tests that the App initializes without errors
    def test_initialization(self):
        assert app is not None

    # Tests that the App sets up tkinter window with correct geometry and title
    def test_window_setup(self):
        app.update_idletasks()
        assert app.geometry().startswith('1200x900')
        assert app.title() == 'Biscuit'

    # Tests that the App handles opening and closing directories without errors
    def test_directory_handling(self):
        app.open_directory(os.getcwd())
        assert app.active_directory == os.getcwd()
        app.close_active_directory()
        assert app.active_directory is None

    # Tests that the App handles opening and closing editors without errors
    def test_editor_handling(self):
        app.open_editor(__file__)
        assert app.editorsmanager.active_editor is not None
        app.close_active_editor()
        assert app.editorsmanager.active_editor is None

    # Tests that the App handles updating Git status and source control without errors
    def test_git_handling(self):
        app.update_git()
        assert app.git_found == False

    # Tests that the App handles opening settings and games without errors
    def test_settings_handling(self):
        app.open_settings()
        assert app.editorsmanager.active_editor is not None
        app.close_active_editor()
        assert app.editorsmanager.active_editor is None
    