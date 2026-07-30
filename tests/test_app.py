import os
import shutil
import subprocess
import tempfile

import pytest


@pytest.mark.integration
class TestApp:
    def test_initialization(self, app_instance):
        assert app_instance is not None
        assert app_instance.initialized

    def test_window_setup(self, app_instance):
        app_instance.update_idletasks()
        assert True

    def test_directory_handling(self, app_instance):
        tmp = tempfile.mkdtemp()
        try:
            app_instance.open_directory(tmp)
            assert app_instance.active_directory == tmp
            app_instance.close_active_directory()
            assert app_instance.active_directory is None
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_editor_handling(self, app_instance):
        tmp = tempfile.mkdtemp()
        try:
            filepath = os.path.join(tmp, "test.txt")
            with open(filepath, "w") as f:
                f.write("hello")
            app_instance.open_editor(filepath)
            assert app_instance.editorsmanager.active_editor is not None
            app_instance.close_active_editor()
            assert app_instance.editorsmanager.active_editor is None
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_file_create_and_save(self, app_instance):
        tmp = tempfile.mkdtemp()
        try:
            filepath = os.path.join(tmp, "new.txt")
            app_instance.open_editor(filepath, exists=False, load_file=False)
            editor = app_instance.editorsmanager.active_editor
            assert editor is not None
            assert not editor.content.exists

            editor.content.insert("1.0", "hello world")
            assert editor.content.get_all_text().strip() == "hello world"

            editor.save(filepath)
            assert os.path.isfile(filepath)
            with open(filepath) as f:
                assert "hello world" in f.read()

            app_instance.close_active_editor()
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_file_open_existing(self, app_instance):
        tmp = tempfile.mkdtemp()
        try:
            filepath = os.path.join(tmp, "existing.txt")
            with open(filepath, "w") as f:
                f.write("hello\n")

            app_instance.open_editor(filepath, exists=True, load_file=True)
            editor = app_instance.editorsmanager.active_editor
            assert editor is not None
            assert editor.content.exists
            app_instance.close_active_editor()
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def _init_git_repo(self, tmp):
        subprocess.run(["git", "init"], cwd=tmp, capture_output=True)
        subprocess.run(
            ["git", "config", "user.email", "test@test.com"],
            cwd=tmp, capture_output=True,
        )
        subprocess.run(
            ["git", "config", "user.name", "Test"],
            cwd=tmp, capture_output=True,
        )
        readme = os.path.join(tmp, ".gitkeep")
        with open(readme, "w") as f:
            f.write("")
        subprocess.run(["git", "add", ".gitkeep"], cwd=tmp, capture_output=True)
        subprocess.run(
            ["git", "commit", "-m", "initial"],
            cwd=tmp, capture_output=True,
        )

    def test_git_init_and_status(self, app_instance):
        tmp = tempfile.mkdtemp()
        try:
            self._init_git_repo(tmp)
            filepath = os.path.join(tmp, "readme.md")
            with open(filepath, "w") as f:
                f.write("# Test\n")

            app_instance.open_directory(tmp)
            assert app_instance.git_found
            app_instance.close_active_directory()
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_git_stage_and_commit(self, app_instance):
        tmp = tempfile.mkdtemp()
        try:
            self._init_git_repo(tmp)

            filepath = os.path.join(tmp, "file.txt")
            with open(filepath, "w") as f:
                f.write("content\n")

            app_instance.open_directory(tmp)
            assert app_instance.git_found

            app_instance.git.repo.index.add(["file.txt"])
            app_instance.git.repo.index.commit("second commit")

            assert not app_instance.git.repo.is_dirty()
            assert len(list(app_instance.git.repo.iter_commits())) == 2

            app_instance.close_active_directory()
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_unsaved_changes_tracking(self, app_instance):
        tmp = tempfile.mkdtemp()
        try:
            filepath = os.path.join(tmp, "track.txt")
            with open(filepath, "w") as f:
                f.write("base content\n")

            app_instance.open_editor(filepath)
            editor = app_instance.editorsmanager.active_editor
            assert not editor.content.unsaved_changes

            editor.content.insert("end", "unsaved line\n")
            assert editor.content.unsaved_changes

            editor.content.save(filepath)
            assert not editor.content.unsaved_changes

            app_instance.close_active_editor()
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_settings_handling(self, app_instance):
        app_instance.open_settings()
        assert app_instance.editorsmanager.active_editor is not None
        app_instance.close_active_editor()
        assert app_instance.editorsmanager.active_editor is None