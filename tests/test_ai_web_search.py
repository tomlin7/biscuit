from biscuit.common.ai.websearch import WebSearchTool

def test_web_search_tool():
    tool = WebSearchTool()
    assert tool.name == "web_search"
    res = tool.run({"query": "requests"})
    assert "requests" in res
    assert "pypi.org" in res
