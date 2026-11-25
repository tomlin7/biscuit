from unittest.mock import MagicMock, patch
from biscuit.cli.extensions import info, list_ext


def test_cli_info_version_display():
    mock_app = MagicMock()
    mock_app.extensions_manager.find_extension_by_name.return_value = (
        "repo_url", "author_name", "Test description", "1.2.3"
    )

    cmd_fn = info.callback("test_ext")
    with patch("click.echo") as mock_echo:
        cmd_fn(mock_app)
        echo_calls = [call.args[0] for call in mock_echo.call_args_list]
        assert "Version: 1.2.3" in echo_calls


def test_cli_list_installed_version_display():
    mock_app = MagicMock()
    mock_app.extensions_manager.list_installed_extensions.return_value = [
        ("my_ext", ("url", "author", "desc", "2.0.0"))
    ]

    cmd_fn = list_ext.callback(user=None, installed=True)
    with patch("click.echo") as mock_echo:
        cmd_fn(mock_app)
        echo_calls = [call.args[0] for call in mock_echo.call_args_list]
        assert any("[0] my_ext [v2.0.0]:" in line for line in echo_calls)
