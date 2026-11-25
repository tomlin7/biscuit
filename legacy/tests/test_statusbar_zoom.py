from unittest.mock import MagicMock
import pytest

from biscuit.layout.statusbar.statusbar import Statusbar


class TestStatusbarZoom:
    def test_change_font_size(self):
        sb = Statusbar.__new__(Statusbar)
        sb.base = MagicMock()
        sb.font_size_btn = MagicMock()

        sb.change_font_size(16)

        sb.base.settings.font.configure.assert_called_once_with(size=16)
        sb.base.editorsmanager.active_editor.content.set_fontsize.assert_called_once_with(16)
        sb.font_size_btn.set_text.assert_called_once_with("16pt")

    def test_change_custom_font_size(self):
        sb = Statusbar.__new__(Statusbar)
        sb.base = MagicMock()
        sb.font_size_btn = MagicMock()

        sb.change_custom_font_size(" 18 ")

        sb.base.settings.font.configure.assert_called_once_with(size=18)
        sb.font_size_btn.set_text.assert_called_once_with("18pt")

    def test_change_font_size_invalid(self):
        sb = Statusbar.__new__(Statusbar)
        sb.base = MagicMock()
        sb.font_size_btn = MagicMock()

        sb.change_font_size("not-a-number")
        sb.font_size_btn.set_text.assert_not_called()
