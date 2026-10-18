from unittest.mock import MagicMock, patch
from biscuit.views.sourcecontrol.placeholder import ChangesTreePlaceholder

def test_init_repo_button():
    placeholder = MagicMock()
    placeholder.base.active_directory = "/tmp/testrepo"
    
    with patch("git.Repo.init") as mock_init:
        ChangesTreePlaceholder.init_repo(placeholder)
        mock_init.assert_called_once_with("/tmp/testrepo")
        placeholder.base.git.check_git.assert_called_once()
