"""
Biscuit Coding Agent
====================

A ReAct (Reasoning + Acting) agent for autonomous coding tasks in the Biscuit IDE.
Uses the provider registry for LLM access — any provider can be plugged in.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
import typing
from typing import Any, Callable, Dict, List, Optional

from .providers import _auto_register, resolve, list_models
from .providers.base import AIProvider, ProviderResponse, ToolDesc
from .state import AgentState, AgentStep, AgentTask
from .tools import get_biscuit_tools


if typing.TYPE_CHECKING:
    from biscuit import App


class Agent:
    """Autonomous coding agent with tool calling and real-time streaming."""

    SYSTEM_PROMPT = """You are Biscuit, an expert software engineering AI assistant integrated into the Biscuit IDE.

## Your Capabilities
You have access to tools that let you read, search, and modify the codebase:
- `read_file` — Examine file contents (use offset/limit for large files)
- `edit_file` — Edit existing files or create new ones (use `// ... existing code ...` markers for unchanged sections)
- `delete_file` — Remove files
- `list_dir` — List directory contents
- `glob_file_search` — Find files matching a pattern
- `grep` — Search file contents using regex (supports -i, -A/-B/-C context)
- `codebase_search` — Find code by meaning/keywords
- `run_terminal_cmd` — Execute shell commands (build, test, lint, etc.)
- `todo_write` — Create/manage a task list for multi-step work
- `get_workspace_info` — Learn about the current project
- `get_active_editor` — See which file is currently open

## How to Solve Problems
1. **Understand** the request fully before acting
2. **Explore** the relevant code to understand the current implementation
3. **Plan** using `todo_write` for multi-step tasks before editing
4. **Implement** changes incrementally, one file at a time
5. **Verify** with tests or lint commands when possible

## Code Editing Rules
- Match the existing code style, naming conventions, and patterns
- Use `// ... existing code ...` (or `# ... existing code ...` for Python) in `edit_file` to keep unchanged sections
- NEVER leave commented-out code
- Handle errors gracefully with proper try/except blocks
- Keep edits focused — don't modify unrelated code

## Communication
- Be concise and direct
- Briefly explain your reasoning before each action
- Summarize changes after completing the task
- If you're unsure, explore more before acting"""

    def __init__(self, base: "App", api_key: str, model_name: str):
        _auto_register()
        self.base = base
        self.api_key = api_key
        self.model_name = model_name

        self.provider: AIProvider = resolve(model_name, api_key)
        self.tools = get_biscuit_tools(base)
        self.mcp_tools: List[ToolDesc] = []

        self.is_running = False
        self.current_task: Optional[AgentTask] = None
        self.chat_history: List[Dict[str, str]] = []
        self.attached_files: List[str] = []

        self.max_steps = 20
        self.iteration_count = 0
        self.input_tokens = 0
        self.output_tokens = 0

        self.stream_callback: Optional[Callable[[str], None]] = None
        self.tool_callback: Optional[Callable[[str, str, str, str], None]] = None
        self.usage_callback: Optional[Callable[[int, int], None]] = None

    def set_stream_callback(self, callback: Callable[[str], None]):
        self.stream_callback = callback

    def set_tool_callback(self, callback: Callable[[str, str, str, str], None]):
        self.tool_callback = callback

    def set_usage_callback(self, callback: Callable[[int, int], None]):
        self.usage_callback = callback

    def set_attached_files(self, files: List[str]):
        self.attached_files = files

    def set_mcp_tools(self, tools: List[ToolDesc]):
        self.mcp_tools = tools

    def _update_usage(self, input_tokens: int = 0, output_tokens: int = 0):
        self.input_tokens += input_tokens
        self.output_tokens += output_tokens
        if self.usage_callback:
            self.usage_callback(self.input_tokens, self.output_tokens)

    def _stream_content(self, content: str):
        if self.stream_callback:
            self.stream_callback(content)

    def _stream_tool(self, name: str, input_str: str, output: str):
        if self.tool_callback:
            category = "analysis" if any(k in name for k in ["read", "list", "search", "grep", "get", "codebase"]) else "edit"
            self.tool_callback(name, input_str, output, category)

    def _all_tool_descs(self) -> List[ToolDesc]:
        descs = []
        for t in self.tools:
            schema = t.args_schema.schema()
            descs.append(ToolDesc(
                name=t.name,
                description=t.description,
                input_schema={
                    "type": "object",
                    "properties": schema.get("properties", {}),
                    "required": schema.get("required", []),
                },
            ))
        descs.extend(self.mcp_tools)
        return descs

    def _tools_map(self) -> Dict[str, Any]:
        builtin = {t.name: t for t in self.tools}
        return builtin

    def _prepare_context(self, user_input: str) -> str:
        parts = [user_input]
        if self.attached_files:
            ctx_parts = ["\n\n## Attached Files for Context"]
            for fpath in self.attached_files:
                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    ctx_parts.append(f"\n### {os.path.basename(fpath)}")
                    ctx_parts.append(f"```\n{content[:3000]}```")
                except Exception as e:
                    ctx_parts.append(f"\n### {os.path.basename(fpath)} (could not read: {e})")
            parts.append("\n".join(ctx_parts))
        return "\n".join(parts)

    def _get_system_instruction(self) -> str:
        active_editor = getattr(self.base.editorsmanager.active_editor, "path", "None")
        workspace_path = getattr(self.base, "active_directory", os.getcwd())
        context_parts = [
            f"Workspace: {workspace_path}",
            f"Active Editor: {active_editor}",
        ]
        if self.attached_files:
            context_parts.append(
                f"Attached Files: {', '.join(os.path.basename(f) for f in self.attached_files)}"
            )
        context = " | ".join(context_parts)
        return f"{self.SYSTEM_PROMPT}\n\n## Current Context\n{context}"

    async def execute_task_with_streaming(self, description: str, **kwargs) -> AgentTask:
        if self.is_running:
            logging.warning("Agent is already running a task. Ignoring new request.")
            return None

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
            start_time=time.time(),
        )
        self.current_task = task

        try:
            full_input = self._prepare_context(description)
            await self._run_chat_session(task, full_input)
            task.status = AgentState.COMPLETED
        except Exception as e:
            logging.error(f"Agent Error: {e}", exc_info=True)
            self._stream_content(f"\n\n**Error:** {e}")
            task.status = AgentState.ERROR
        finally:
            self.is_running = False
            task.end_time = time.time()
            self._stream_content("[DONE]")

        return task

    async def _run_chat_session(self, task: AgentTask, inputs: str):
        """Execute task with provider-native tool calling and real-time streaming."""
        tools_map = self._tools_map()
        system_instruction = self._get_system_instruction()
        tool_descs = self._all_tool_descs()

        messages: List[Dict[str, Any]] = []
        for msg in self.chat_history[-10:]:
            messages.append({"role": "user" if msg["role"] == "User" else "assistant", "content": msg["content"]})
        messages.append({"role": "user", "content": inputs})

        for i in range(self.max_steps):
            if not self.is_running:
                break

            self.iteration_count = i + 1
            if i > 0:
                await asyncio.sleep(0.5)

            thought_start = time.time()
            self._stream_content("[START_THOUGHT]")

            try:
                response = await self.provider.generate(
                    system_instruction=system_instruction,
                    messages=messages,
                    tools=tool_descs,
                    stream_callback=lambda t: self._stream_content(t),
                )
            except Exception as e:
                self._stream_content(f"\n\n**Error:** {e}")
                raise

            self._update_usage(response.input_tokens, response.output_tokens)

            thought_duration = time.time() - thought_start
            self._stream_content(f"[END_THOUGHT] {thought_duration:.1f}")

            assistant_msg: Dict[str, Any] = {"role": "assistant", "content": response.text or ""}

            if not response.tool_calls:
                messages.append(assistant_msg)
                self.chat_history.append({"role": "User", "content": inputs})
                self.chat_history.append({"role": "AI", "content": response.text or ""})
                return

            calls = []
            for tc in response.tool_calls:
                call_id = tc.id or f"call_{self.iteration_count}_{len(calls)}"
                calls.append({"id": call_id, "name": tc.name, "args": tc.args})

            assistant_msg["tool_calls"] = calls
            messages.append(assistant_msg)

            for tc in response.tool_calls:
                name = tc.name
                args = tc.args
                call_id = tc.id or ""

                try:
                    if name in tools_map:
                        tool = tools_map[name]
                        observation = tool.run(dict(args))
                        self._stream_tool(name, json.dumps(dict(args)), str(observation))
                        task.steps.append(AgentStep(
                            step_number=self.iteration_count,
                            state=AgentState.EDITING if any(x in name for x in ["edit", "write", "delete"]) else AgentState.SEARCHING,
                            action=name,
                            reasoning="",
                            result=str(observation),
                        ))
                    else:
                        observation = f"Error: Tool '{name}' not found."
                except Exception as e:
                    observation = f"Error executing tool: {e}"

                messages.append({
                    "role": "tool",
                    "content": str(observation),
                    "name": name,
                    "tool_call_id": call_id,
                })

    def process_message(self, message: str) -> str:
        return self.provider.process_message(message)

    def process_message_sync(self, message: str) -> str:
        return self.process_message(message)

    def stop_execution(self):
        self.is_running = False
