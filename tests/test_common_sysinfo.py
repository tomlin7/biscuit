import platform
from unittest.mock import MagicMock, patch

import pytest

from biscuit.common.sysinfo import SysInfo


class TestSysInfo:
    @pytest.fixture
    def sysinfo(self, mock_base):
        with patch("biscuit.common.sysinfo.platform.system", return_value="Windows"):
            with patch("biscuit.common.sysinfo.platform.version", return_value="10.0"):
                with patch("biscuit.common.sysinfo.platform.release", return_value="10"):
                    with patch("biscuit.common.sysinfo.platform.machine", return_value="AMD64"):
                        with patch("biscuit.common.sysinfo.platform.processor", return_value="Intel64"):
                            si = SysInfo(mock_base)
                            yield si

    def test_init(self, sysinfo):
        assert sysinfo.os == "Windows"
        assert sysinfo.version == "10.0"
        assert sysinfo.release == "10"
        assert sysinfo.machine == "AMD64"
        assert sysinfo.processor == "Intel64"

    def test_is_windows_true(self, sysinfo):
        assert sysinfo.is_windows is True

    def test_is_windows_false(self, mock_base):
        with patch("biscuit.common.sysinfo.platform.system", return_value="Linux"):
            si = SysInfo(mock_base)
            assert si.is_windows is False

    def test_is_linux_true(self, mock_base):
        with patch("biscuit.common.sysinfo.platform.system", return_value="Linux"):
            si = SysInfo(mock_base)
            assert si.is_linux is True

    def test_is_linux_false(self, sysinfo):
        assert sysinfo.is_linux is False

    def test_is_macos_true(self, mock_base):
        with patch("biscuit.common.sysinfo.platform.system", return_value="Darwin"):
            si = SysInfo(mock_base)
            assert si.is_macos is True

    def test_is_macos_false(self, sysinfo):
        assert sysinfo.is_macos is False

    def test_get_current_stats(self, sysinfo):
        with patch("biscuit.common.sysinfo.psutil.cpu_percent", return_value=42.0):
            with patch("biscuit.common.sysinfo.psutil.virtual_memory") as mock_mem:
                mock_mem.return_value.percent = 65.0
                stats = sysinfo.get_current_stats()
                assert "CPU: 42.0%" in stats
                assert "Mem: 65.0%" in stats

    def test_str(self, sysinfo):
        result = str(sysinfo)
        assert "BISCUIT" in result
        assert "Windows" in result
        assert "Python" in result
        assert "MIT License" in result

    def test_str_linux(self, mock_base):
        with patch("biscuit.common.sysinfo.platform.system", return_value="Linux"):
            with patch("biscuit.common.sysinfo.platform.version", return_value="5.15.0"):
                with patch("biscuit.common.sysinfo.platform.release", return_value="22.04"):
                    with patch("biscuit.common.sysinfo.platform.machine", return_value="x86_64"):
                        with patch("biscuit.common.sysinfo.platform.processor", return_value="x86_64"):
                            si = SysInfo(mock_base)
                            result = str(si)
                            assert "Linux" in result
