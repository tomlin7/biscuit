from unittest.mock import MagicMock
from biscuit.extensions.manager import ExtensionManager


def test_extension_recommendations():
    mgr = ExtensionManager.__new__(ExtensionManager)
    mgr.recommended_extensions = ["python", "rust"]
    mgr.available_extensions = {
        "Python": {"submodule": "python", "name": "Python"},
        "Rust": {"submodule": "rust", "name": "Rust"},
        "Random": {"submodule": "random_ext", "name": "Random"},
    }
    mgr.fetch_queue = MagicMock()
    mgr.base = MagicMock()

    assert mgr.is_recommended("Python", {"submodule": "python"}) is True
    assert mgr.is_recommended("Rust", {"submodule": "rust"}) is True
    assert mgr.is_recommended("Random", {"submodule": "random_ext"}) is False

    mgr.display_recommended_extensions()
    queued = [call[0][0][0] for call in mgr.fetch_queue.put.call_args_list]
    assert "Python" in queued
    assert "Rust" in queued
    assert "Random" not in queued
