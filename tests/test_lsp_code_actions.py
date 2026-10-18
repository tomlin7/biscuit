from biscuit.language.code_actions import CodeActionManager, CodeAction

def test_code_actions():
    mgr = CodeActionManager()
    mgr.set_actions([
        CodeAction("Import os", "quickfix"),
        CodeAction("Extract function", "refactor.extract"),
    ])
    qf = mgr.get_quick_fixes()
    assert len(qf) == 1
    assert qf[0].title == "Import os"

    rf = mgr.get_refactorings()
    assert len(rf) == 1
    assert rf[0].title == "Extract function"
