"""
Quick ReAct Agent for Biscuit Editor
====================================

This module implements a fast ReAct (Reasoning + Acting) agent for quick tasks.
Unlike the Planning Agent, this agent:
1. jumps directly into execution
2. uses tools dynamically in a tight loop
3. is optimized for speed and simple tasks
"""

from __future__ import annotations

import asyncio
import logging
import time
import typing
import re
from typing import Any, Callable, Dict, List, Optional

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import BaseTool
from pydantic import SecretStr

from .state import AgentState, AgentStep, AgentTask
from .tools import get_biscuit_tools

if typing.TYPE_CHECKING:
    from biscuit import App


class ReActAgent:
    """
    Quick ReAct agent for simple, fast tasks.
    
    Implements the standard ReAct pattern:
    Thought -> Action -> Observation -> Thought...
    """
    
    def __init__(self, base: App, api_key: str, model_name: str = "gemini-2.0-flash-exp"):
        self.base = base
        self.api_key = api_key
        self.model_name = model_name
        
        self.tools = get_biscuit_tools(base)
        self.llm = self._initialize_llm()
        
        # State
        self.is_running = False
        self.current_task = None
        self.chat_history = []
        
        # Callbacks
        self.stream_callback = None
        self.tool_callback = None

    def _initialize_llm(self) -> BaseChatModel:
        """Initialize the language model."""
        if not self.api_key:
            raise ValueError("API key must be provided")
            
        return ChatGoogleGenerativeAI(
            model=self.model_name,
            api_key=SecretStr(self.api_key),
            temperature=0.1,
            max_tokens=8192,
            timeout=60,
        )

    def set_stream_callback(self, callback: Callable[[str], None]):
        """Set callback for streaming content."""
        self.stream_callback = callback
        
    def set_tool_callback(self, callback: Callable[[str, str, str], None]):
        """Set callback for tool execution."""
        self.tool_callback = callback

    def _stream_content(self, content: str):
        if self.stream_callback:
            self.stream_callback(content)
            
    def _stream_tool(self, name: str, input_str: str, output: str):
        if self.tool_callback:
            self.tool_callback(name, input_str, output)

    async def execute_task_with_streaming(self, description: str) -> AgentTask:
        """Execute task using ReAct loop."""
        self.is_running = True

        # Re-initialize LLM to ensure it uses the current asyncio loop
        self.llm = self._initialize_llm()
        
        task = AgentTask(
            id=f"task_{int(time.time())}",
            description=description,
            requirements=[],
            constraints=[],
            success_criteria=[],
            steps=[],
            status=AgentState.THINKING,
            start_time=time.time()
        )
        self.current_task = task

        try:
            # wrapper to capture tool usage
            tools_map = {t.name: t for t in self.tools}
            
            # Custom executor loop to handle streaming/UI updates
            await self._execute_react_loop(task, description, tools_map)
            
            task.status = AgentState.COMPLETED
            
        except Exception as e:
            task.status = AgentState.ERROR
            self._stream_content(f"Error: {e}")
        finally:
            self.is_running = False
            task.end_time = time.time()
            
        return task

    async def _execute_react_loop(self, task: AgentTask, inputs: str, tools_map: Dict[str, BaseTool]):
        """Manual ReAct loop execution."""
        
        max_steps = 15
        scratchpad = ""
        
        # Format history
        history_str = ""
        if hasattr(self, 'chat_history') and self.chat_history:
            history_str = "Conversation History:\n" + "\n".join(
                [f"{msg['role']}: {msg['content']}" for msg in self.chat_history[-10:]]
            ) + "\n\n"
        
        # Inject initial context if new chat
        if not self.chat_history and "list_directory" in tools_map:
            try:
                # Auto-run list_directory to give immediate context
                tool = tools_map["list_directory"]
                context_result = tool.run(".")
                scratchpad += f"Observation (Auto-Context): {context_result}\n"
            except Exception as e:
                pass
        
        status_message = ""
        
        for i in range(max_steps):
            if not self.is_running:
                break
                
            # 1. Thought
            prompt = f"""Answer the following questions as best you can. You have access to the following tools:

{self._render_tools(self.tools)}

CRITICAL RULES:
1. DO NOT GUESS about the codebase, files, or state. You are a new blank slate agent.
2. ALWAYS use a tool (like `list_directory`, `get_active_editor`, `read_file`) to verify facts before answering.
3. If asked about "open files", use `get_active_editor` AND `get_workspace_info`.
4. If you don't know the answer, say you don't know or use a tool to find out.
5. Trust tool outputs over your internal knowledge.

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{', '.join(tools_map.keys())}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

{history_str}Question: {inputs}
Thought:{scratchpad}"""

            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            text = response.content
            
            # Parse response
            new_thought = text
            
            # Logic to parse Action
            action_match = re.search(r"Action:\s*(.*?)\n", text)
            action_input_match = re.search(r"Action Input:\s*(.*)", text, re.DOTALL)
            final_answer_match = re.search(r"Final Answer:\s*(.*)", text, re.DOTALL)
            
            if final_answer_match:
                answer = final_answer_match.group(1).strip()
                self._stream_content(f"Final Answer: {answer}")
                
                # Save to memory
                if not hasattr(self, 'chat_history'):
                    self.chat_history = []
                self.chat_history.append({"role": "User", "content": inputs})
                self.chat_history.append({"role": "AI", "content": answer})
                
                step = AgentStep(
                    step_number=i+1, 
                    state=AgentState.COMPLETED, 
                    action="finish", 
                    reasoning=text.split("Final Answer:")[0].strip(),
                    result=answer
                )
                task.steps.append(step)
                return

            if action_match and action_input_match:
                action = action_match.group(1).strip()
                action_input = action_input_match.group(1).strip()
                
                # Stream thought before action
                thought_part = text.split("Action:")[0].strip()
                if thought_part:
                    self._stream_content(thought_part)
                
                # Execute Action
                if action in tools_map:
                    tool = tools_map[action]
                    step = AgentStep(step_number=i+1, state=AgentState.EDITING, action=action, reasoning=thought_part)
                    
                    self._stream_content(f"Executing {action}...")
                    try:
                        clean_input = action_input.strip()
                        if clean_input.startswith("```"):
                            clean_input = clean_input.split("```")[1]
                            if clean_input.startswith("json"):
                                clean_input = clean_input[4:]
                        clean_input = clean_input.strip().strip("'").strip('"')
                        
                        observation = tool.run(clean_input)
                    except Exception as e:
                        observation = f"Error in tool arguments: {e}"

                    self._stream_tool(action, action_input, str(observation))
                    step.result = str(observation)
                    
                    scratchpad += f"{text}\nObservation: {observation}\n"
                    task.steps.append(step)
                else:
                    msg = f"Action '{action}' not found in tools."
                    self._stream_content(msg)
                    scratchpad += f"{text}\nObservation: {msg}\n"
            else:
                # No action found, just streaming thought
                self._stream_content(text)
                if "Final Answer" not in text:
                    scratchpad += f"{text}\nObservation: You must output an Action or Final Answer.\n"
    
    def _render_tools(self, tools):
        return "\n".join([f"{t.name}: {t.description}" for t in tools])

    def stop_execution(self):
        self.is_running = False
