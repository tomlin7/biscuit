from biscuit.views.explorer.multi_root import MultiRootWorkspaceManager

def test_multi_root_workspace():
    mgr = MultiRootWorkspaceManager()
    f1 = mgr.add_folder("Backend", "/projects/backend")
    f2 = mgr.add_folder("Frontend", "/projects/frontend")

    assert len(mgr.list_folders()) == 2
    assert mgr.list_folders()[0].name == "Backend"

    removed = mgr.remove_folder("/projects/backend")
    assert removed == f1
    assert len(mgr.list_folders()) == 1
