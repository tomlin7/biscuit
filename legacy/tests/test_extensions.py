from unittest.mock import MagicMock

import pytest

from biscuit.extensions.extension import Extension


class TestExtension:
    def test_init(self):
        api = MagicMock()
        ext = Extension(api)
        assert ext.api == api

    def test_install(self):
        ext = Extension(MagicMock())
        ext.install()

    def test_uninstall(self):
        ext = Extension(MagicMock())
        ext.uninstall()

    def test_setup_exists(self):
        from biscuit.extensions.extension import setup
        api = MagicMock()
        setup(api)
