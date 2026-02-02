"""
Biscuit Coding Agent
====================

A powerful ReAct (Reasoning + Acting) agent designed for autonomous coding tasks
in the Biscuit IDE. Powered by Google Gemini.

The agent follows the classic ReAct pattern:
Thought:     Reason about the current state and decide what to do next.
Action:      Select a tool to interact with the environment.
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

from google import genai
from google.genai import types
import anthropic

from .state import AgentState, AgentStep, AgentTask
from .tools import get_biscuit_tools

if typing.TYPE_CHECKING:
    from biscuit import App


class Agent:
    """
    Biscuit Coding Agent - An autonomous AI assistant for coding tasks.

    Powered by AI SDKs with native function calling.
    Designed for maximum transparency with real-time thought streaming.
    """

    def __init__(self, base: "App", api_key: str, model_name: str = "gemini-2.0-flash"):
        self.base = base
        self.api_key = api_key
        self.model_name = model_name

        self.tools = get_biscuit_tools(base)
        self.gemini_client: Optional[genai.Client] = None
        self.anthropic_client: Optional[anthropic.AsyncAnthropic] = None

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

    def _initialize_gemini_client(self) -> genai.Client:
        """Initialize the Google GenAI client."""
        if not self.api_key:
            raise ValueError("API key must be provided")

        return genai.Client(
            api_key=self.api_key,
            http_options=types.HttpOptions(
                retry_options=types.HttpRetryOptions(attempts=3)
            )
        )

    def _initialize_anthropic_client(self) -> anthropic.AsyncAnthropic:
        """Initialize the Anthropic client."""
        if not self.api_key:
            raise ValueError("API key must be provided")
        
        return anthropic.AsyncAnthropic(api_key=self.api_key)

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
            category = "analysis" if any(k in name for k in ["read", "list", "search", "grep", "get", "codebase"]) else "edit"
            self.tool_callback(name, input_str, output, category)

    def _notify_step(self, step: AgentStep):
        for cb in self.step_callbacks:
            try:
                cb(step)
            except:
                pass

    # --- Core Execution Engine ---

    async def execute_task_with_streaming(self, description: str, **kwargs) -> AgentTask:
        """Main entry point for task execution with UI streaming."""
        if self.is_running:
            logging.warning("Agent is already running a task. Ignoring new request.")
            return

        self.is_running = True
        self.iteration_count = 0

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
            # Force recreation of the client on the current loop/thread
            if "claude" in self.model_name.lower():
                self.anthropic_client = self._initialize_anthropic_client()
            else:
                self.gemini_client = self._initialize_gemini_client()
            
            # Main execution loop using native function calling
            await self._run_chat_session(task, description)
            task.status = AgentState.COMPLETED
        except Exception as e:
            logging.error(f"Agent Error: {e}", exc_info=True)
            self._stream_content(f"Error: {e}")
            task.status = AgentState.ERROR
        finally:
            self.is_running = False
            task.end_time = time.time()
            self._stream_content("[DONE]")

        return task

    async def _run_chat_session(self, task: AgentTask, inputs: str):
        """Routes the task to the appropriate provider."""
        if "claude" in self.model_name.lower():
            await self._run_anthropic_session(task, inputs)
        else:
            await self._run_gemini_session(task, inputs)

    async def _run_gemini_session(self, task: AgentTask, inputs: str):
        """Execute task using native Google GenAI async chat sessions with real-time streaming."""
        
        tools_map = {t.name: t for t in self.tools}



        system_instruction = self._get_system_instruction()
        
        # Build contents list starting with chat history
        contents = []
        for msg in self.chat_history[-10:]:
            role = "user" if msg['role'] == "User" else "model"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg['content'])]))
        
        # Add current input
        contents.append(types.Content(role="user", parts=[types.Part(text=inputs)]))

        for i in range(self.max_steps):
            if not self.is_running:
                break
            
            self.iteration_count = i + 1
            if i > 0:
                await asyncio.sleep(1)

            # 1. Generate Response (Async Stream)
            self._stream_content("[START_THOUGHT]")
            model_parts = []
            try:
                stream = await self.gemini_client.aio.models.generate_content_stream(
                    model=self.model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        tools=[types.Tool(function_declarations=self._get_tool_declarations())],
                        temperature=0,
                    )
                )

                async for response in stream:
                    if not response.candidates:
                        continue
                    
                    candidate = response.candidates[0]
                    if not candidate.content or not candidate.content.parts:
                        continue
                        
                    for part in candidate.content.parts:
                        if part.text:
                            # Stream text chunks to UI immediately
                            self._stream_content(part.text)
                            model_parts.append(part)
                        if part.function_call:
                            # Collector tool calls to execute after stream ends
                            model_parts.append(part)

            except Exception as e:
                err_msg = str(e).lower()
                if "429" in err_msg or "resource_exhausted" in err_msg:
                    self._stream_content("\n\n⚠️ **Rate Limit Exceeded**: You've hit your API limit. Please wait a moment or switch to a model with a higher quota.")
                elif "401" in err_msg or "authentication" in err_msg:
                    self._stream_content("\n\n🔑 **Invalid API Key**: The Google Gemini API key is invalid or missing. Please check your configuration.")
                else:
                    self._stream_content(f"Gemini API Error: {e}")
                raise e

            self._stream_content("[END_THOUGHT] 1")

            # 2. Process Response
            tool_calls = [p.function_call for p in model_parts if p.function_call]

            # Update history with model response
            contents.append(types.Content(role="model", parts=model_parts))

            if not tool_calls:
                # Task finished
                self.chat_history.append({"role": "User", "content": inputs})
                self.chat_history.append({"role": "AI", "content": "".join([p.text or "" for p in model_parts if p.text])})
                return

            # 3. Execute Tools
            tool_responses = []
            for call in tool_calls:
                name = call.name
                args = call.args
                self._stream_content(f"Executing {name}...")
                
                try:
                    if name in tools_map:
                        tool = tools_map[name]
                        observation = tool.run(args)
                        self._stream_tool(name, json.dumps(args), str(observation))
                        
                        step = AgentStep(
                            step_number=self.iteration_count,
                            state=AgentState.EDITING if any(x in name for x in ["edit", "write", "delete"]) else AgentState.SEARCHING,
                            action=name,
                            reasoning="Executing tool call.",
                            result=str(observation)
                        )
                        task.steps.append(step)
                        self._notify_step(step)
                    else:
                        observation = f"Error: Tool '{name}' not found."
                        self._stream_content(observation)
                except Exception as e:
                    observation = f"Error executing tool: {e}"
                    self._stream_content(observation)

                tool_responses.append(types.Part(
                    function_response=types.FunctionResponse(
                        name=name,
                        response={"result": observation}
                    )
                ))

            # Update history with tool observations
            contents.append(types.Content(role="user", parts=tool_responses))

    async def _run_anthropic_session(self, task: AgentTask, inputs: str):
        """Execute task using Anthropic's native async SDK with streaming."""
        tools_map = {t.name: t for t in self.tools}
        anthropic_tools = self._get_anthropic_tools()


        system_instruction = self._get_system_instruction()
        
        # Build message history
        messages = []
        for msg in self.chat_history[-10:]:
            role = "user" if msg['role'] == "User" else "assistant"
            messages.append({"role": role, "content": msg['content']})
        
        # Add current input
        messages.append({"role": "user", "content": inputs})

        for i in range(self.max_steps):
            if not self.is_running:
                break
            
            self.iteration_count = i + 1
            if i > 0:
                await asyncio.sleep(1)

            # 1. Generate Response (Async Stream)
            self._stream_content("[START_THOUGHT]")
            
            full_content = []
            current_text = ""
            
            try:
                # We use the simplified stream helper from Anthropic
                async with self.anthropic_client.messages.stream(
                    model=self.model_name,
                    max_tokens=4000,
                    system=system_instruction,
                    tools=anthropic_tools,
                    messages=messages,
                    temperature=0
                ) as stream:
                    async for event in stream:
                        if event.type == "text":
                            self._stream_content(event.text)
                            current_text += event.text
                        elif event.type == "input_json":
                            # We'll get the final message at the end
                            pass
                
                # Get the final response to handle tool usage
                final_message = await stream.get_final_message()
                messages.append({"role": "assistant", "content": final_message.content})
                
                tool_calls = [c for c in final_message.content if c.type == "tool_use"]
                
                # If no tool calls, we are done
                if not tool_calls:
                    self.chat_history.append({"role": "User", "content": inputs})
                    self.chat_history.append({"role": "AI", "content": current_text})
                    return

                # 2. Execute Tools
                tool_results = []
                for call in tool_calls:
                    name = call.name
                    args = call.input
                    self._stream_content(f"Executing {name}...")
                    
                    try:
                        if name in tools_map:
                            tool = tools_map[name]
                            observation = tool.run(args)
                            self._stream_tool(name, json.dumps(args), str(observation))
                            
                            step = AgentStep(
                                step_number=self.iteration_count,
                                state=AgentState.EDITING if any(x in name for x in ["edit", "write", "delete"]) else AgentState.SEARCHING,
                                action=name,
                                reasoning="Executing tool call.",
                                result=str(observation)
                            )
                            task.steps.append(step)
                            self._notify_step(step)
                        else:
                            observation = f"Error: Tool '{name}' not found."
                            self._stream_content(observation)
                    except Exception as e:
                        observation = f"Error executing tool: {e}"
                        self._stream_content(observation)

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": call.id,
                        "content": str(observation)
                    })

                # Update history with tool observations
                messages.append({"role": "user", "content": tool_results})

            except Exception as e:
                err_msg = str(e).lower()
                if "429" in err_msg or "rate_limit" in err_msg:
                    self._stream_content("\n\n⚠️ **Rate Limit Exceeded**: You've hit your Anthropic API limit. Please wait a moment.")
                elif "401" in err_msg or "authentication" in err_msg:
                    self._stream_content("\n\n🔑 **Invalid API Key**: The Anthropic API key is invalid or missing. Please check your configuration.")
                else:
                    self._stream_content(f"Anthropic API Error: {e}")
                raise e
            finally:
                self._stream_content("[END_THOUGHT] 1")

    def _get_anthropic_tools(self) -> List[Dict[str, Any]]:
        """Convert tools to Anthropic's format."""
        anthropic_tools = []
        for tool in self.tools:
            # Pydantic schema is mostly compatible with Anthropic's input_schema
            schema = tool.args_schema.schema()
            anthropic_tools.append({
                "name": tool.name,
                "description": tool.description,
                "input_schema": {
                    "type": "object",
                    "properties": schema.get("properties", {}),
                    "required": schema.get("required", [])
                }
            })
        return anthropic_tools

    def _get_system_instruction(self) -> str:
        """Construct the system instruction for the model."""
        active_editor = getattr(self.base.editorsmanager.active_editor, 'path', 'None')
        workspace_path = getattr(self.base, 'active_directory', os.getcwd())

        return f"""Biscuit AI Assistant. Workspace: {workspace_path}, Editor: {active_editor}.
Rules: Use tools to read/edit code. Execute plans immediately. Be concise."""

    def _get_tool_declarations(self) -> List[types.FunctionDeclaration]:
        """Convert LangChain tools to Google GenAI function declarations."""
        declarations = []
        for tool in self.tools:
            # We map the JSON schema from LangChain/Pydantic to GenAI FunctionDeclaration
            schema = tool.args_schema.schema()
            
            properties = {}
            required = []
            
            raw_props = schema.get('properties', {})
            for prop_name, prop_info in raw_props.items():
                p_type = prop_info.get('type', 'string').upper()
                if p_type == 'INTEGER': p_type = 'INTEGER'
                elif p_type == 'NUMBER': p_type = 'NUMBER'
                elif p_type == 'BOOLEAN': p_type = 'BOOLEAN'
                elif p_type == 'ARRAY': p_type = 'ARRAY'
                else: p_type = 'STRING'

                kwargs = {
                    "type": p_type,
                    "description": prop_info.get('description', '')
                }

                if p_type == 'ARRAY':
                    # Gemini requires 'items' for ARRAY types
                    item_info = prop_info.get('items', {'type': 'string'})
                    item_type = item_info.get('type', 'string').upper()
                    if item_type == 'NUMBER': item_type = 'NUMBER'
                    elif item_type == 'INTEGER': item_type = 'INTEGER'
                    elif item_type == 'BOOLEAN': item_type = 'BOOLEAN'
                    elif item_type == 'OBJECT': item_type = 'OBJECT'
                    else: item_type = 'STRING'
                    
                    kwargs['items'] = types.Schema(type=item_type)

                properties[prop_name] = types.Schema(**kwargs)
                if prop_name in schema.get('required', []):
                    required.append(prop_name)

            declarations.append(types.FunctionDeclaration(
                name=tool.name,
                description=tool.description,
                parameters=types.Schema(
                    type='OBJECT',
                    properties=properties,
                    required=required
                )
            ))
        return declarations

    def process_message(self, message: str) -> str:
        """Single-turn message processing (Backwards Compatibility)."""
        if "claude" in self.model_name.lower():
            client = anthropic.Anthropic(api_key=self.api_key)
            response = client.messages.create(
                model=self.model_name,
                max_tokens=1000,
                messages=[{"role": "user", "content": message}]
            )
            return response.content[0].text if response.content else ""
        else:
            if not self.gemini_client:
                self.gemini_client = self._initialize_gemini_client()
            
            response = self.gemini_client.models.generate_content(
                model=self.model_name,
                contents=message,
                config=types.GenerateContentConfig(
                    temperature=0,
                )
            )
            return response.text if response.candidates else ""

    def stop_execution(self):
        """Stop the running agent loop."""
        self.is_running = False

    # --- Backwards Compatibility ---

    async def execute_task(self, description: str, **kwargs) -> AgentTask:
        return await self.execute_task_with_streaming(description, **kwargs)

    def _generate_progress_summary(self, task: AgentTask) -> str:
        return f"Completed {len(task.steps)} steps."

    def _is_task_complete(self, task: AgentTask) -> bool:
        return task.status == AgentState.COMPLETED
