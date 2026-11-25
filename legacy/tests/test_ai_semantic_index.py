from biscuit.common.ai.semantic_index import SemanticCodeIndex

def test_semantic_code_indexing():
    idx = SemanticCodeIndex()
    idx.index_chunk("src/app.py", 1, 10, "class Application: def run(self): pass")
    idx.index_chunk("src/utils.py", 1, 5, "def calculate_sum(a, b): return a + b")

    res = idx.search("Application run")
    assert len(res) == 1
    assert res[0][0] == "src/app.py"

    res2 = idx.search("calculate sum")
    assert len(res2) == 1
    assert res2[0][0] == "src/utils.py"
