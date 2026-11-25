from biscuit.language.rename import WorkspaceRenameManager

def test_workspace_rename():
    mgr = WorkspaceRenameManager()
    edit_payload = {
        "changes": {
            "file:///path/a.py": [{"range": {"start": {"line": 1, "character": 4}}, "newText": "new_name"}],
            "file:///path/b.py": [{"range": {"start": {"line": 5, "character": 8}}, "newText": "new_name"}]
        }
    }
    count = mgr.parse_workspace_edit(edit_payload)
    assert count == 2
    assert len(mgr.pending_edits) == 2
