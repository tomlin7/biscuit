from unittest.mock import MagicMock

from biscuit.views.gitgraph import GitGraph


class TestGitGraph:
    def test_gitgraph_parsing_and_filtering(self):
        mock_master = MagicMock()
        mock_master.base = MagicMock()
        mock_base = mock_master.base
        mock_base.git.repo.git.log.return_value = (
            "* 7a45aa9\x00 (HEAD -> main, tag: v1.0)\x00Tomlin7\x002026-10-15\x00Initial commit\n"
            "| * 97a24cd\x00 (feat/branch)\x00Author2\x002026-10-14\x00Feature commit\n"
            "|/  \n"
        )
        mock_base.git.repo.git.show.return_value = "7a45aa9 Initial commit\n 2 files changed, 10 insertions(+)"

        view = GitGraph(mock_master)
        assert view.name == "Git Graph"

        # Check parsing
        data = view.get_commit_graph_data()
        assert len(data) == 3
        assert data[0]["hash"] == "7a45aa9"
        assert data[0]["refs"] == "HEAD -> main, tag: v1.0"
        assert data[0]["author"] == "Tomlin7"
        assert data[0]["message"] == "Initial commit"
        assert data[0]["graph"] == "*"

        assert data[1]["hash"] == "97a24cd"
        assert data[1]["refs"] == "feat/branch"
        assert data[1]["author"] == "Author2"

        # Test filtering
        view.commits = data
        view.tree.insert = MagicMock()
        view.search_entry.get = lambda: "initial"
        view.filter_commits()
        assert view.tree.insert.call_count == 1
        call_values = view.tree.insert.call_args[1]["values"]
        assert call_values[1] == "7a45aa9"
        assert call_values[3] == "Initial commit"

        # Test on_select details
        view.tree.selection = MagicMock(return_value=["item1"])
        view.tree.item = MagicMock(
            return_value=("*", "7a45aa9", "HEAD -> main", "Initial commit", "Tomlin7", "2026-10-15")
        )
        view.details_text = MagicMock()
        view.on_select()
        view.details_text.insert.assert_any_call(
            "end",
            "Commit:  7a45aa9 (HEAD -> main)\nAuthor:  Tomlin7\nDate:    2026-10-15\nSubject: Initial commit\n\n",
        )
