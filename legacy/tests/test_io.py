import os
import queue
import tempfile
from unittest.mock import MagicMock, patch

import pytest

from biscuit.common.io import IO


class TestIO:
    @pytest.fixture
    def io_instance(self, mock_base):
        io_obj = IO.__new__(IO)
        io_obj.master = MagicMock()
        io_obj.master.base = mock_base
        io_obj.base = mock_base
        io_obj.alive = True
        io_obj.cmd = "echo test"
        io_obj.cwd = tempfile.gettempdir()
        io_obj.in_queue = queue.Queue()
        io_obj.out_queue = queue.Queue()
        io_obj.p = MagicMock()
        io_obj.t_out = MagicMock()
        io_obj.t_out.is_alive.return_value = True
        return io_obj

    def test_init(self, mock_base):
        master = MagicMock()
        master.base = mock_base
        io_obj = IO(master, "echo test", tempfile.gettempdir())
        assert io_obj.cmd == "echo test"
        assert io_obj.alive is True
        assert io_obj.in_queue is not None
        assert io_obj.out_queue is not None

    def test_write(self, io_instance):
        io_instance.write(b"test data")
        assert io_instance.in_queue.get_nowait() == b"test data"

    def test_read_returns_data(self, io_instance):
        io_instance.out_queue.put(b"h")
        io_instance.out_queue.put(b"e")
        io_instance.out_queue.put(b"y")
        result = io_instance.read()
        assert result == b"hey"

    def test_read_empty_queue(self, io_instance):
        result = io_instance.read()
        io_instance.t_out.is_alive.return_value = True
        assert result is None

    def test_stop_sets_alive_false(self, io_instance):
        io_instance.alive = True
        io_instance.stop()
        assert io_instance.alive is False
        io_instance.p.kill.assert_called_once()
        io_instance.p.wait.assert_called_once()

    def test_write_then_read(self, io_instance):
        io_instance.write(b"hello")
        data = io_instance.in_queue.get_nowait()
        assert data == b"hello"
