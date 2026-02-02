"""
Enhanced ReAct Coding Agent for Biscuit Editor
==============================================

This module implements a powerful, looping ReAct (Reasoning + Acting) agent 
designed to handle complex coding tasks autonomously.

The agent follows the classic ReAct pattern:
Thought:   Reason about the current state and decide what to do next.
Action:    Select a tool to interact with the environment.
Observation: The result/output of the tool execution.
... (repeat) ...
Final Answer: Solve the user's request.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
import typing
from typing import Any, Callable, Dict, List, Optional, Tuple

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.tools import BaseTool
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import SecretStr

from .state import AgentState, AgentStep, AgentTask
from .tools import get_biscuit_tools

if typing.TYPE_CHECKING:
    from biscuit import App


class Agent:
    """
    Unified Autonomous Coding Agent.
    
    A robust ReAct implementation that loops until the task is complete.
    Designed for maximum transparency with real-time thought streaming.
    """
    
    def __init__(self, base: App, api_key: str, model_name: str = "gemini-2.0-flash-exp"):
        self.base = base
        self.api_key = api_key
        self.model_name = model_name
        
        self.tools = get_biscuit_tools(base)
        self.llm = self._initialize_llm()
        
        # Agent status
        self.is_running = False
        self.current_task: Optional[AgentTask] = None
        self.chat_history: List[Dict[str, str]] = []
        
        # Step tracking
        self.max_steps = 15
        self.iteration_count = 0
        
        # Callbacks for UI integration
        self.progress_callbacks: List[Callable] = []
        self.step_callbacks: List[Callable] = []
        self.stream_callback: Optional[Callable[[str], None]] = None
        self.tool_callback: Optional[Callable[[str, str, str, str], None]] = None

    def _initialize_llm(self) -> BaseChatModel:
        """Initialize the language model."""
        if not self.api_key:
            raise ValueError("API key must be provided")
            
        return ChatGoogleGenerativeAI(
            model=self.model_name,
            api_key=SecretStr(self.api_key),
            temperature=0, # Deterministic for coding
            max_tokens=8192,
            timeout=120,
        )

    # --- Callbacks Configuration ---

    def add_progress_callback(self, callback: Callable):
        self.progress_callbacks.append(callback)
    
    def add_step_callback(self, callback: Callable):
        self.step_callbacks.append(callback)
    
    def set_stream_callback(self, callback: Callable[[str], None]):
        self.stream_callback = callback
    
    def set_tool_callback(self, callback: Callable[[str, str, str, str], None]):
        self.tool_callback = callback

    # --- Streaming Helpers ---

    def _stream_content(self, content: str):
        if self.stream_callback:
            self.stream_callback(content)

    def _stream_tool(self, name: str, input_str: str, output: str):
        if self.tool_callback:
            # Categorize tool for UI badge rendering
            category = "analysis" if any(k in name for k in ["read", "view", "list", "search", "find", "get", "analyze"]) else "edit"
            self.tool_callback(name, input_str, output, category)

    def _notify_step(self, step: AgentStep):
        for cb in self.step_callbacks:
            try: cb(step)
            except: pass

    # --- Core Execution Engine ---

    async def execute_task_with_streaming(self, description: str, **kwargs) -> AgentTask:
        """Main entry point for task execution with UI streaming."""
        self.is_running = True
        self.iteration_count = 0
        
        # Ensure LLM is fresh for the current loop
        self.llm = self._initialize_llm()
        
        task = AgentTask(
            id=f"task_{int(time.time())}",
            description=description,
            requirements=kwargs.get("requirements", []),
            constraints=kwargs.get("constraints", []),
            success_criteria=kwargs.get("success_criteria", []),
            steps=[],
            status=AgentState.THINKING,
            start_time=time.time()
        )
        self.current_task = task

        try:
            # 1. Direct Chat Handling (Detect simple greetings/questions)
            if self._is_simple_conversational(description):
                await self._handle_simple_chat(task, description)
            else:
                # 2. Main ReAct Loop for coding tasks
                await self._run_react_loop(task, description)
            
            task.status = AgentState.COMPLETED
        except Exception as e:
            logging.error(f"Agent Error: {e}", exc_info=True)
            self._stream_content(f"Error: {e}")
            task.status = AgentState.ERROR
        finally:
            self.is_running = False
            task.end_time = time.time()
            self._stream_content(f"[DONE]")
            
        return task

    def _is_simple_conversational(self, text: str) -> bool:
        """Check if the input is likely just a greeting or simple non-coding question."""
        text = text.lower().strip()
        greetings = {"hi", "hello", "hey", "who are you", "what can you do"}
        if text in greetings or len(text.split()) < 3:
            return True
        return False

    async def _handle_simple_chat(self, task: AgentTask, inputs: str):
        """Quickly reply to greetings or simple chat input."""
        prompt = f"The user said: '{inputs}'. Provide a short, friendly response as a coding assistant."
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        reply = response.content
        
        self._stream_content(reply)
        
        step = AgentStep(
            step_number=1,
            state=AgentState.COMPLETED,
            action="chat_reply",
            reasoning="Simple conversational input detected.",
            result=reply
        )
        task.steps.append(step)
        self.chat_history.append({"role": "User", "content": inputs})
        self.chat_history.append({"role": "AI", "content": reply})

    async def _run_react_loop(self, task: AgentTask, inputs: str):
        """Execute the standard ReAct loop: Thought -> Action -> Observation."""
        
        tools_map = {t.name: t for t in self.tools}
        scratchpad = "" # Stores Thought/Action/Observation history for the LLM
        
        # Format history for prompt
        history_str = ""
        if self.chat_history:
            history_str = "Recent Conversation:\n" + "\n".join(
                [f"{msg['role']}: {msg['content']}" for msg in self.chat_history[-5:]]
            ) + "\n\n"

        for i in range(self.max_steps):
            if not self.is_running:
                break
                
            self.iteration_count = i + 1
            
            # --- 1. THOUGHT PHASE ---
            thought_start = time.time()
            self._stream_content("[START_THOUGHT]")
            
            prompt = self._build_react_prompt(inputs, history_str, scratchpad, list(tools_map.keys()))
            
            # Use a streaming-friendly approach if langchain supports it here, 
            # but for ReAct, we usually need the full block to parse reliably.
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            text = response.content
            if isinstance(text, list):
                text = "".join([part.get("text", str(part)) if isinstance(part, dict) else str(part) for part in text])
            else:
                text = str(text)
            
            thought_duration = int(time.time() - thought_start)
            self._stream_content(f"[END_THOUGHT] {thought_duration}")

            # --- 2. PARSE PHASE ---
            parsed = self._parse_react_response(text)
            
            if parsed.get("final_answer"):
                answer = parsed["final_answer"]
                self._stream_content(answer)
                
                # Update task and memory
                step = AgentStep(
                    step_number=self.iteration_count,
                    state=AgentState.COMPLETED,
                    action="finish",
                    reasoning=parsed.get("thought", "Task complete."),
                    result=answer
                )
                task.steps.append(step)
                self.chat_history.append({"role": "User", "content": inputs})
                self.chat_history.append({"role": "AI", "content": answer})
                return

            if parsed.get("action"):
                action = parsed["action"]
                action_input = parsed["action_input"]
                thought = parsed.get("thought", "Thinking...")
                
                # Stream the thought portion for user visibility
                self._stream_content(thought)
                
                # --- 3. ACTION PHASE ---
                if action in tools_map:
                    tool = tools_map[action]
                    self._stream_content(f"Executing {action}...")
                    
                    try:
                        # Normalize tool input if it's wrapped in markers
                        clean_input = action_input.strip()
                        if clean_input.startswith("```"):
                            parts = clean_input.split("```")
                            if len(parts) >= 3: clean_input = parts[1]
                        
                        observation = tool.run(clean_input)
                    except Exception as e:
                        observation = f"Error executing tool: {e}"

                    # Update UI and scratchpad
                    self._stream_tool(action, action_input, str(observation))
                    
                    step = AgentStep(
                        step_number=self.iteration_count,
                        state=AgentState.EDITING if "write" in action or "replace" in action else AgentState.SEARCHING,
                        action=action,
                        reasoning=thought,
                        result=str(observation)
                    )
                    task.steps.append(step)
                    self._notify_step(step)
                    
                    # Add to scratchpad for next iteration
                    scratchpad += f"\nThought: {thought}\nAction: {action}\nAction Input: {action_input}\nObservation: {observation}\n"
                else:
                    msg = f"Error: Tool '{action}' not found."
                    self._stream_content(msg)
                    scratchpad += f"\nThought: {thought}\nObservation: {msg}\n"
            else:
                # LLM failed to follow format
                msg = "Reasoning continue..."
                self._stream_content(text)
                scratchpad += f"\n{text}\nObservation: You must provide either an Action or a Final Answer in the specified format.\n"

    def _build_react_prompt(self, question: str, history: str, scratchpad: str, tool_names: List[str]) -> str:
        """Construct the ReAct system prompt."""
        return f"""You are Biscuit AI, a high-performance autonomous coding assistant.
You solve tasks by thinking step-by-step and using tools to interact with the codebase.

=== CRITICAL RULES ===
1. NO GUESSING: Always verify file contents and structures using tools.
2. EXPLORE FIRST: Use `list_directory`, `get_directory_tree`, or `search_code` before reading/writing.
3. BE PRECISE: Use `replace_in_file` for specific edits, `write_file` only for new or rewritten files.
4. MINIMAL STEPS: Aim for efficient, direct solutions.

=== FORMAT ===
You must use the following format for every response:

Thought: reason about what to do next.
Action: the name of the tool to use (one of [{', '.join(tool_names)}]).
Action Input: the EXACT input for the tool (path, pattern, code chunk, etc.).
Observation: [this is provided by the system, do not write this yourself]

When you have the solution:
Thought: I have finished the task.
Final Answer: a clear, concise summary of what you did and the results.

=== BEGIN ===
{history}
Question: {question}

{scratchpad}
Thought:"""

    def _parse_react_response(self, text: str) -> Dict[str, str]:
        """Parse Thought, Action, Action Input, or Final Answer from LLM response."""
        result = {}
        
        # Extraction logic
        thought_match = re.search(r"Thought:\s*(.*?)(?=\nAction:|\nFinal Answer:|$)", text, re.DOTALL)
        action_match = re.search(r"Action:\s*(.*?)\n", text)
        action_input_match = re.search(r"Action Input:\s*(.*)", text, re.DOTALL)
        final_answer_match = re.search(r"Final Answer:\s*(.*)", text, re.DOTALL)
        
        if thought_match:
            result["thought"] = thought_match.group(1).strip()
        
        if final_answer_match:
            result["final_answer"] = final_answer_match.group(1).strip()
        elif action_match:
            result["action"] = action_match.group(1).strip()
            if action_input_match:
                # Take input until "Observation:" or end of string
                inp = action_input_match.group(1).strip()
                result["action_input"] = inp.split("\nObservation:")[0].strip()
            else:
                result["action_input"] = ""
                
        return result

    def stop_execution(self):
        """Stop the running agent loop."""
        self.is_running = False

    # --- Backwards Compatibility / Legacy Support ---
    # These methods are kept to prevent breaking existing UI code, 
    # but they all route to the new robust engine.

    async def execute_task(self, description: str, **kwargs) -> AgentTask:
        return await self.execute_task_with_streaming(description, **kwargs)

    def _generate_progress_summary(self, task: AgentTask) -> str:
        return f"Completed {len(task.steps)} steps."

    def _is_task_complete(self, task: AgentTask) -> bool:
        return task.status == AgentState.COMPLETED

