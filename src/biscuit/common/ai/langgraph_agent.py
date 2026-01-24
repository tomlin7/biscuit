"""
LangGraph-based Autonomous Coding Agent for Biscuit Editor
=========================================================

This module implements a LangGraph-based agent that mirrors the stepwise reasoning and tool usage of the previous agent,
but leverages LangGraph's node/edge/graph abstractions for composability and extensibility.
"""

from __future__ import annotations

import typing

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, START, StateGraph
from pydantic import SecretStr

from .tools import get_biscuit_tools

# Remove unused/invalid imports from old schema



# Define the agent state for LangGraph
class BiscuitAgentState(typing.TypedDict):
    task_description: str
    requirements: list[str]
    constraints: list[str]
    success_criteria: list[str]
    steps: list[dict]
    memory: dict
    status: str
    result: typing.Optional[str]

# Define nodes for each agent step
def plan_node(state: BiscuitAgentState) -> BiscuitAgentState:
    llm = plan_node.llm
    prompt = f"""
You are a coding agent. Task: {state['task_description']}\nRequirements: {state['requirements']}\nConstraints: {state['constraints']}\nSuccess: {state['success_criteria']}\nPlan the steps to solve this task.
"""
    response = llm.invoke([HumanMessage(content=prompt)])
    plan = response.content if hasattr(response, 'content') else str(response)
    state['steps'].append({"action": "plan", "result": plan})
    state['status'] = "PLANNED"
    return state

def search_node(state: BiscuitAgentState) -> BiscuitAgentState:
    tools = search_node.tools
    search_tool = next((t for t in tools if t.name == "search_code"), None)
    if search_tool:
        result = search_tool._run("auth|login|user")
        state['steps'].append({"action": "search", "result": result})
    state['status'] = "SEARCHED"
    return state

def analyze_node(state: BiscuitAgentState) -> BiscuitAgentState:
    tools = analyze_node.tools
    analyze_tool = next((t for t in tools if t.name == "analyze_code"), None)
    if analyze_tool:
        result = analyze_tool._run("src/biscuit/app.py", "structure")
        state['steps'].append({"action": "analyze", "result": result})
    state['status'] = "ANALYZED"
    return state

def implement_node(state: BiscuitAgentState) -> BiscuitAgentState:
    tools = implement_node.tools
    write_tool = next((t for t in tools if t.name == "write_file"), None)
    if write_tool:
        result = write_tool._run("src/biscuit/app.py", "# Implemented change\n")
        state['steps'].append({"action": "implement", "result": result})
    state['status'] = "IMPLEMENTED"
    return state

def test_node(state: BiscuitAgentState) -> BiscuitAgentState:
    tools = test_node.tools
    test_tool = next((t for t in tools if t.name == "run_tests"), None)
    if test_tool:
        result = test_tool._run()
        state['steps'].append({"action": "test", "result": result})
    state['status'] = "TESTED"
    return state

def review_node(state: BiscuitAgentState) -> BiscuitAgentState:
    summary = "\n".join(f"{s['action']}: {s['result'][:100]}" for s in state['steps'])
    state['result'] = summary
    state['status'] = "REVIEWED"
    return state

# Main LangGraph agent class
class LangGraphBiscuitAgent:
    def __init__(self, base, api_key: str, model_name: str = "gemini-2.0-flash-exp"):
        self.base = base
        self.api_key = api_key
        self.model_name = model_name
        self.llm = ChatGoogleGenerativeAI(
            model=self.model_name,
            api_key=SecretStr(self.api_key),
            temperature=0.1,
            max_tokens=8192,
            timeout=60,
        )
        self.tools = get_biscuit_tools(base)
        # Attach LLM/tools to node functions
        plan_node.llm = self.llm
        search_node.tools = self.tools
        analyze_node.tools = self.tools
        implement_node.tools = self.tools
        test_node.tools = self.tools
        # Build the graph
        self.graph = self._build_graph()

    def _build_graph(self):
        builder = StateGraph(BiscuitAgentState)
        builder.add_node("plan", plan_node)
        builder.add_node("search", search_node)
        builder.add_node("analyze", analyze_node)
        builder.add_node("implement", implement_node)
        builder.add_node("test", test_node)
        builder.add_node("review", review_node)
        builder.add_edge(START, "plan")
        builder.add_edge("plan", "search")
        builder.add_edge("search", "analyze")
        builder.add_edge("analyze", "implement")
        builder.add_edge("implement", "test")
        builder.add_edge("test", "review")
        builder.add_edge("review", END)
        compiled = builder.compile()
        return compiled

    def run(self, description: str, requirements=None, constraints=None, success_criteria=None):
        state = dict(
            task_description=description,
            requirements=requirements or [],
            constraints=constraints or [],
            success_criteria=success_criteria or [],
            steps=[],
            memory={},
            status="IDLE",
            result=None,
        )
        final_state = self.graph.invoke(state)
        return final_state
