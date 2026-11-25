import os
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from biscuit.extensions.scaffolder import create_extension


class TestScaffolder:
    def test_url_parsing_https(self):
        with patch("biscuit.extensions.scaffolder._cookiecutter", MagicMock()):
            with tempfile.TemporaryDirectory() as tmpdir:
                result = create_extension(
                    "myext",
                    template="https://github.com/user/repo.git",
                    output_dir=tmpdir,
                )
                assert result is False

    def test_url_parsing_git_ssh(self):
        with patch("biscuit.extensions.scaffolder._cookiecutter", MagicMock()):
            with tempfile.TemporaryDirectory() as tmpdir:
                result = create_extension(
                    "myext",
                    template="git@github.com:user/repo.git",
                    output_dir=tmpdir,
                )
                assert result is False

    def test_default_template(self):
        with patch("biscuit.extensions.scaffolder._cookiecutter", MagicMock()):
            with patch(
                "biscuit.extensions.scaffolder.Path.exists",
                return_value=True,
            ):
                with tempfile.TemporaryDirectory() as tmpdir:
                    with patch("biscuit.extensions.scaffolder.Path.cwd") as mock_cwd:
                        mock_cwd.return_value = Path(tmpdir)
                        result = create_extension("myext")
                        assert result is False

    def test_destination_exists_no_force(self):
        with (
            patch("biscuit.extensions.scaffolder._cookiecutter") as mock_cc,
            tempfile.TemporaryDirectory() as tmpdir,
        ):
            ext_dir = Path(tmpdir) / "myext"
            ext_dir.mkdir()
            result = create_extension("myext", output_dir=tmpdir)
            assert result is False
            assert ext_dir.exists()

    def test_destination_exists_with_force(self):
        with (
            patch("biscuit.extensions.scaffolder._cookiecutter") as mock_cc,
            tempfile.TemporaryDirectory() as tmpdir,
        ):
            ext_dir = Path(tmpdir) / "myext"
            ext_dir.mkdir()
            result = create_extension("myext", output_dir=tmpdir, force=True)
            assert result is False

    def test_no_cookiecutter(self):
        with patch("biscuit.extensions.scaffolder._cookiecutter", None):
            with tempfile.TemporaryDirectory() as tmpdir:
                result = create_extension("myext", output_dir=tmpdir)
                assert result is False

    def test_cookiecutter_failure(self):
        mock_cc = MagicMock()
        mock_cc.side_effect = Exception("clone failed")
        with (
            patch("biscuit.extensions.scaffolder._cookiecutter", mock_cc),
            tempfile.TemporaryDirectory() as tmpdir,
        ):
            result = create_extension("myext", output_dir=tmpdir)
            assert result is False

    def test_cookiecutter_success(self):
        def _mock_cc(repo_url, **kwargs):
            (Path(kwargs["output_dir"]) / "myext").mkdir(parents=True)
        mock_cc = MagicMock(side_effect=_mock_cc)
        with (
            patch("biscuit.extensions.scaffolder._cookiecutter", mock_cc),
            tempfile.TemporaryDirectory() as tmpdir,
        ):
            result = create_extension("myext", output_dir=tmpdir)
            assert result is True
            mock_cc.assert_called_once()

    def test_cookiecutter_existing_dir(self):
        mock_cc = MagicMock()
        with (
            patch("biscuit.extensions.scaffolder._cookiecutter", mock_cc),
            tempfile.TemporaryDirectory() as tmpdir,
        ):
            ext_dir = Path(tmpdir) / "myext"
            ext_dir.mkdir(parents=True)
            result = create_extension("myext", output_dir=tmpdir)
            assert result is False
            mock_cc.assert_not_called()

    def test_shorthand_template(self):
        with patch("biscuit.extensions.scaffolder._cookiecutter") as mock_cc:
            with tempfile.TemporaryDirectory() as tmpdir:
                create_extension("myext", template="widget", output_dir=tmpdir)
                url = mock_cc.call_args[0][0]
                assert "widget" in url
