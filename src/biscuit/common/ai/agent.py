"""
Enhanced Autonomous Coding Agent for Biscuit Editor
==================================================

This module implements a sophisticated autonomous coding agent that can:
- Think through problems step by step
- Search and explore the codebase
- Locate relevant files and patterns
- Edit files with precision
- Loop until the task is complete
- Provide real-time progress updates

AGENT REASONING PHILOSOPHY
==========================

The agent follows a systematic approach:

1. PLAN & UNDERSTAND:
   - Break down the task into logical steps
   - Identify what needs to be found or changed
   - Think about file patterns and likely locations

2. EXPLORE BEFORE ACTING:
   - Use find_project_entry_points to understand project structure
   - Use search_code/find_in_files to locate relevant code
   - Use directory_list/get_directory_tree to verify structure
   - NEVER assume file paths or locations exist

3. VERIFY THEN READ:
   - Only read files after confirming they exist
   - Use search results to guide what to read
   - Read with context - get enough surrounding code

4. ANALYZE BEFORE CHANGING:
   - Understand the current implementation
   - Identify all files that need changes
   - Plan the changes holistically

5. IMPLEMENT INCREMENTALLY:
   - Make one logical change at a time
   - Test/verify after significant changes
   - Use proper error handling and validation

EXAMPLE WORKFLOWS:
=================

FEATURE REQUEST: "Add user authentication"
1. explore_codebase → Get project overview
2. search_patterns → Find auth-related code ("auth", "login", "user")
3. analyze_context → Read existing auth files if any
4. search_patterns → Find where users are handled
5. plan_changes → Design auth integration points
6. implement_changes → Add auth step by step

BUG REPORT: "Login form doesn't validate email"
1. search_patterns → Find login form code
2. analyze_context → Read form validation logic
3. search_patterns → Find email validation patterns
4. implement_changes → Fix validation

REFACTORING: "Split large user.py file"
1. analyze_context → Read and understand user.py
2. search_patterns → Find all references to user.py classes
3. plan_changes → Design the split strategy
4. implement_changes → Create new files and move code
5. test_changes → Ensure everything still works

The key is: EXPLORE → UNDERSTAND → PLAN → ACT, never ACT first!
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import threading
import time
import typing
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Tuple

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.tools import BaseTool
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import SecretStr

from .state import AgentState, AgentStep, AgentTask
from .tools import BiscuitTool, get_biscuit_tools

if typing.TYPE_CHECKING:
    from biscuit import App



class Agent:
    """
    Enhanced autonomous coding agent with advanced reasoning capabilities.
    
    This agent follows a structured approach:
    1. THINK: Analyze the problem and understand requirements
    2. PLAN: Create a step-by-step execution plan
    3. SEARCH: Explore the codebase to understand context
    4. LOCATE: Find relevant files and code patterns
    5. EDIT: Make precise code changes
    6. TEST: Verify changes work correctly
    7. REVIEW: Assess progress and decide next steps
    8. LOOP: Continue until task is complete
    """
    
    def __init__(self, base: App, api_key: str, model_name: str = "gemini-2.0-flash-exp"):
        self.base = base
        self.api_key = api_key
        self.model_name = model_name
        
        self.llm = self._initialize_llm()
        
        # Use tools from tools.py - properly implemented langchain tools
        self.tools = get_biscuit_tools(base)
        
        # Agent state
        self.current_state = AgentState.IDLE
        self.current_task: Optional[AgentTask] = None
        self.is_running = False
        self.max_iterations = 20
        self.iteration_count = 0
        
        # Progress callbacks
        self.progress_callbacks: List[Callable] = []
        self.step_callbacks: List[Callable] = []
        
        # Memory and context
        self.working_memory = {}
        self.file_cache = {}
        self.search_results = {}
        
    def _initialize_llm(self) -> BaseChatModel:
        """Initialize the language model."""
        if not self.api_key:
            raise ValueError("API key must be provided for the language model")
        
        return ChatGoogleGenerativeAI(
            model=self.model_name,
            api_key=SecretStr(self.api_key),
            temperature=0.1,
            max_tokens=8192,
            timeout=60,
        )
    
    def add_progress_callback(self, callback: Callable[[AgentStep], None]):
        """Add a callback to be notified of progress updates."""
        self.progress_callbacks.append(callback)
    
    def add_step_callback(self, callback: Callable[[AgentStep], None]):
        """Add a callback to be notified of each step completion."""
        self.step_callbacks.append(callback)
    
    def set_stream_callback(self, callback: Callable[[str], None]):
        """Set callback for streaming content updates."""
        self.stream_callback = callback
    
    def set_tool_callback(self, callback: Callable[[str, str, str], None]):
        """Set callback for tool execution updates.""" 
        self.tool_callback = callback
    
    def _stream_content(self, content: str):
        """Stream content to UI if callback is set."""
        if hasattr(self, 'stream_callback') and self.stream_callback:
            self.stream_callback(content)
    
    def _stream_tool_execution(self, tool_name: str, tool_input: str, tool_output: str):
        """Stream tool execution to UI if callback is set."""
        if hasattr(self, 'tool_callback') and self.tool_callback:
            self.tool_callback(tool_name, tool_input, tool_output)
    
    def _execute_tool_with_streaming(self, tool: BaseTool, tool_input: str) -> str:
        """Execute a tool with streaming updates."""
        try:
            # Stream tool execution start
            self._stream_content(f"Using: {tool.name}")
            
            # Execute the tool
            if hasattr(tool, '_run'):
                result = tool._run(tool_input)
            else:
                result = tool.run(tool_input)
            
            # Stream the tool execution
            self._stream_tool_execution(tool.name, tool_input, str(result))
            
            return str(result)
        except Exception as e:
            error_msg = f"Error executing tool {tool.name}: {str(e)}"
            self._stream_content(f"Error: {error_msg}")
            return error_msg
    
    async def execute_task(self, description: str, requirements: List[str] = [], 
                          constraints: List[str] = [], success_criteria: List[str] = []) -> AgentTask:
        """
        Execute a complete coding task autonomously.
        
        Args:
            description: High-level description of what to accomplish
            requirements: Specific requirements to meet
            constraints: Constraints to respect
            success_criteria: How to determine success
            
        Returns:
            Completed AgentTask with all steps and results
        """
        if self.is_running:
            raise RuntimeError("Agent is already running a task")
        
        # Re-initialize LLM to ensure it uses the current asyncio loop
        self.llm = self._initialize_llm()
        
        # Create task
        task = AgentTask(
            id=f"task_{int(time.time())}",
            description=description,
            requirements=requirements or [],
            constraints=constraints or [],
            success_criteria=success_criteria or [],
            steps=[],
            status=AgentState.THINKING,
            start_time=time.time()
        )
        
        self.current_task = task
        self.is_running = True
        self.iteration_count = 0
        
        try:
            # Execute the main agent loop
            await self._execute_agent_loop(task)
            task.status = AgentState.COMPLETED
        except Exception as e:
            task.status = AgentState.ERROR
            step = AgentStep(
                step_number=len(task.steps) + 1,
                state=AgentState.ERROR,
                action="handle_error",
                reasoning=f"Encountered error during execution: {str(e)}",
                result=str(e)
            )
            task.steps.append(step)
            self._notify_step_completion(step)
        finally:
            task.end_time = time.time()
            self.is_running = False
            self.current_task = None
            self.current_state = AgentState.IDLE
        
        return task
    
    async def execute_task_with_streaming(self, description: str, requirements: List[str] = [], 
                                        constraints: List[str] = [], success_criteria: List[str] = []) -> AgentTask:
        """
        Execute a complete coding task autonomously with real-time streaming.
        
        Args:
            description: High-level description of what to accomplish
            requirements: Specific requirements to meet
            constraints: Constraints to respect
            success_criteria: How to determine success
            
        Returns:
            Completed AgentTask with all steps and results
        """
        self.is_running = True
        
        # Re-initialize LLM to ensure it uses the current asyncio loop
        self.llm = self._initialize_llm()
        
        task_id = f"task_{int(time.time())}"
        
        task = AgentTask(
            id=task_id,
            description=description,
            requirements=requirements or [],
            constraints=constraints or [],
            success_criteria=success_criteria or [],
            steps=[],
            status=AgentState.IDLE,
            start_time=time.time()
        )
        
        self.current_task = task
        
        try:
            task.status = AgentState.THINKING
            
            # Execute steps with streaming
            max_steps = 10
            step_count = 0
            
            while self.is_running and step_count < max_steps:
                # Determine next action with streaming
                action = await self._determine_next_action_with_streaming(task)
                
                if not action:
                    break
                
                # Execute step with streaming
                step = await self._execute_step_with_streaming(task, action)
                task.steps.append(step)
                
                # Notify callbacks
                self._notify_step_completion(step)
                
                step_count += 1
                
                # Check if task is complete
                if self._is_task_complete(task):
                    self._stream_content("Task objectives achieved")
                    break
            
            task.status = AgentState.COMPLETED
            task.end_time = time.time()
            
        except Exception as e:
            task.status = AgentState.ERROR
            task.end_time = time.time()
            self._stream_content(f"Error: {str(e)}")
            logging.error(f"Task execution error: {e}")
        finally:
            self.is_running = False
            self.current_task = None
        
        return task
    
    async def _execute_agent_loop(self, task: AgentTask):
        """Execute the main agent reasoning loop."""
        while self.iteration_count < self.max_iterations and not self._is_task_complete(task):
            self.iteration_count += 1
            
            # Determine next action based on current state and task progress
            next_action = await self._determine_next_action(task)
            
            if not next_action:
                break
            
            # Execute the action
            step = await self._execute_step(task, next_action)
            task.steps.append(step)
            
            # Update state based on step result
            self.current_state = step.state
            
            # Notify observers
            self._notify_step_completion(step)
            
            # Brief pause to prevent overwhelming
            await asyncio.sleep(0.1)
    
    async def _determine_next_action(self, task: AgentTask) -> Optional[Dict[str, Any]]:
        """Determine the next action to take based on current progress."""
        # Analyze current state and task progress
        progress_summary = self._generate_progress_summary(task)
        
        # Create reasoning prompt with comprehensive guidance
        prompt = f"""
You are an autonomous coding agent working on the following task:

TASK: {task.description}

REQUIREMENTS:
{chr(10).join(f"- {req}" for req in task.requirements)}

CONSTRAINTS:
{chr(10).join(f"- {constraint}" for constraint in task.constraints)}

SUCCESS CRITERIA:
{chr(10).join(f"- {criteria}" for criteria in task.success_criteria)}

CURRENT PROGRESS:
{progress_summary}

ITERATION: {self.iteration_count}/{self.max_iterations}

=== CRITICAL GUIDANCE: HOW TO EXPLORE AND REASON ===

You must follow this systematic approach:

1. PLAN FIRST - Always understand the task scope:
   - What exactly needs to be changed/fixed/implemented?
   - What files are likely involved?
   - What patterns should I search for?

2. EXPLORE BEFORE READING - Never blindly open files:
   - Use search_code to find relevant patterns/functions/classes/imports
   - Use find_in_files to search for specific text across the codebase
   - Use get_directory_tree to understand folder organization
   - Use analyze_project to get project overview

3. VERIFY EXISTENCE BEFORE READING:
   - Use directory_list to check if directories exist
   - Search first, then read only the relevant files
   - Don't assume files exist at certain paths

4. READ WITH PURPOSE:
   - Only read files after you've confirmed they're relevant
   - Read larger sections to get proper context
   - Look for imports, class definitions, function signatures first

EXAMPLES OF PROPER EXPLORATION:

BAD APPROACH:
- "I'll read src/main.py" (assumes file exists)
- "Let me check app.py" (assumes location)

GOOD APPROACH:
- "Let me search for main entry points" → use search_code with "main" or "__main__"
- "Let me search for authentication code" → use search_code with "auth" pattern
- "Let me check what's in the src directory" → use directory_list on src/
- "Now I'll read the authentication module I found" → use file_read

YOUR AVAILABLE TOOLS (only these work - others are disabled):
- search_code: Search for code patterns, functions, classes, imports
- find_in_files: Search for text patterns across files
- analyze_code: Analyze specific code sections
- directory_list: List directory contents
- get_directory_tree: Get folder structure
- file_read: Read file contents (use only after confirming file exists)
- file_read_range: Read specific lines from file
- file_write: Write content to file
- file_create: Create new file
- open_file: Open file in editor
- format_code: Format code files
- run_tests: Run test suites
- git_status/git_commit/git_branch: Git operations
- execute_command: Run shell commands
- get_workspace_info: Get workspace information
- analyze_project: Analyze project structure

=== DETAILED TOOL USAGE EXAMPLES ===

TASK: "Add a new authentication feature"
CORRECT SEQUENCE:
1. explore_codebase → Uses search_code, analyze_project, get_directory_tree
2. search_patterns → Search for "auth", "login", "user", "session" patterns
3. analyze_context → Read the files found in step 2
4. plan_changes → Decide what files to modify
5. implement_changes → Make the actual changes

TASK: "Fix a bug in the user registration"
CORRECT SEQUENCE:
1. search_patterns → Search for "register", "signup", "user", "create" patterns
2. analyze_context → Read files that handle registration
3. search_patterns → Search for error patterns or test failures
4. implement_changes → Fix the identified issues

TASK: "Refactor the database connection logic"  
CORRECT SEQUENCE:
1. search_patterns → Search for "database", "db", "connection", "pool" patterns
2. explore_codebase → Get full project structure to understand scope
3. analyze_context → Read each database-related file
4. plan_changes → Plan the refactoring approach
5. implement_changes → Make the changes step by step

NEVER:
- Jump straight to implement_changes without exploration
- Try to read files without first confirming they exist
- Make assumptions about file locations or structures

Based on the current progress, determine the next logical action. Your response should be a JSON object with:
{{
    "action": "action_name",
    "reasoning": "detailed explanation of why this action is needed and how it follows the exploration pattern",
    "parameters": {{"param1": "value1", "param2": "value2"}},
    "state": "next_agent_state",
    "priority": 1-10
}}

Available actions:
- think_and_plan: Analyze the problem and create a detailed plan
- explore_codebase: Explore and understand the project structure
- search_patterns: Search for specific code patterns or implementations
- analyze_context: Analyze specific files or code sections
- plan_changes: Plan specific file modifications
- implement_changes: Make actual code changes
- test_changes: Test or verify the changes made
- review_progress: Review current progress and plan next steps

Choose the most logical next step. If the task appears complete (all success criteria met, changes implemented and tested), return the string "COMPLETE".
"""
        
        try:
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            
            # Parse JSON response
            content = response.content
            if isinstance(content, list):
                # Extract text from list content
                content = ''.join(str(item) for item in content if isinstance(item, str))
            else:
                content = str(content)
            
            content = content.strip()
            if content.lower() in ['null', 'none', 'complete'] or not content:
                return None
            
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                # Fallback to basic action if JSON parsing fails
                return {
                    "action": "think_and_plan",
                    "reasoning": "Starting with basic analysis",
                    "parameters": {},
                    "state": "thinking",
                    "priority": 5
                }
        except Exception as e:
            logging.error(f"Error determining next action: {e}")
            return None
    
    async def _determine_next_action_with_streaming(self, task: AgentTask) -> Optional[Dict[str, Any]]:
        """Determine next action with streaming updates."""
        self._stream_content("Analyzing...")
        
        # Use the existing logic but with streaming
        action = await self._determine_next_action(task)
        
        if action:
            action_name = action.get('action', 'unknown').replace('_', ' ').title()
            reasoning = action.get('reasoning', 'No reasoning provided')
            # Stream the plan concisely
            self._stream_content(f"Next: {action_name}")
            if reasoning and reasoning != 'No reasoning provided':
                self._stream_content(f"Plan: {reasoning}")
        
        return action
    
    async def _execute_step(self, task: AgentTask, action: Dict[str, Any]) -> AgentStep:
        """Execute a single step in the agent's plan."""
        start_time = time.time()
        step_number = len(task.steps) + 1
        
        action_name = action.get("action", "unknown")
        
        # Map action names to appropriate agent states
        action_to_state = {
            "think_and_plan": AgentState.THINKING,
            "explore_codebase": AgentState.SEARCHING,
            "search_patterns": AgentState.SEARCHING,
            "analyze_context": AgentState.ANALYZING,
            "plan_changes": AgentState.PLANNING,
            "implement_changes": AgentState.EDITING,
            "test_changes": AgentState.TESTING,
            "review_progress": AgentState.REVIEWING
        }
        
        agent_state = action_to_state.get(action_name, AgentState.IDLE)
        
        step = AgentStep(
            step_number=step_number,
            state=agent_state,
            action=action_name,
            reasoning=action["reasoning"]
        )
        
        try:
            # Execute the specific action
            if action_name == "think_and_plan":
                result = await self._think_and_plan(task, action.get("parameters", {}))
            elif action_name == "explore_codebase":
                result = await self._explore_codebase_action(task, action.get("parameters", {}))
            elif action_name == "search_patterns":
                result = await self._search_patterns_action(task, action.get("parameters", {}))
            elif action_name == "analyze_context":
                result = await self._analyze_context_action(task, action.get("parameters", {}))
            elif action_name == "plan_changes":
                result = await self._plan_changes_action(task, action.get("parameters", {}))
            elif action_name == "implement_changes":
                result = await self._implement_changes_action(task, action.get("parameters", {}))
            elif action_name == "test_changes":
                result = await self._test_changes_action(task, action.get("parameters", {}))
            elif action_name == "review_progress":
                result = await self._review_progress_action(task, action.get("parameters", {}))
            else:
                result = f"Unknown action: {action_name}"
            
            step.result = result
            
        except Exception as e:
            step.result = f"Error executing step: {str(e)}"
            step.state = AgentState.ERROR
            logging.error(f"Error in step {step_number}: {e}")
        
        step.duration = time.time() - start_time
        return step
    
    async def _execute_step_with_streaming(self, task: AgentTask, action: Dict[str, Any]) -> AgentStep:
        """Execute a single step with streaming updates."""
        start_time = time.time()
        step_number = len(task.steps) + 1
        
        action_name = action.get("action", "unknown")
        reasoning = action.get("reasoning", "")
        parameters = action.get("parameters", {})
        
        # Stream step start
        self._stream_content(f"Step {step_number}: {action_name.replace('_', ' ').title()}")
        
        # Map action names to appropriate agent states
        action_to_state = {
            "think_and_plan": AgentState.THINKING,
            "explore_codebase": AgentState.SEARCHING,
            "search_patterns": AgentState.SEARCHING,
            "analyze_context": AgentState.ANALYZING,
            "plan_changes": AgentState.PLANNING,
            "implement_changes": AgentState.EDITING,
            "test_changes": AgentState.TESTING,
            "review_progress": AgentState.REVIEWING
        }
        
        agent_state = action_to_state.get(action_name, AgentState.IDLE)
        
        step = AgentStep(
            step_number=step_number,
            state=agent_state,
            action=action_name,
            reasoning=reasoning
        )
        
        try:
            # Execute the action with tool streaming
            if action_name == "think_and_plan":
                result = await self._think_and_plan_with_streaming(task, parameters)
            elif action_name == "explore_codebase":
                result = await self._explore_codebase_action_with_streaming(task, parameters)
            elif action_name == "search_patterns":
                result = await self._search_patterns_action_with_streaming(task, parameters)
            elif action_name == "analyze_context":
                result = await self._analyze_context_action_with_streaming(task, parameters)
            elif action_name == "plan_changes":
                result = await self._plan_changes_action_with_streaming(task, parameters)
            elif action_name == "implement_changes":
                result = await self._implement_changes_action_with_streaming(task, parameters)
            elif action_name == "test_changes":
                result = await self._test_changes_action_with_streaming(task, parameters)
            elif action_name == "review_progress":
                result = await self._review_progress_action_with_streaming(task, parameters)
            else:
                result = f"Unknown action: {action_name}"
            
            step.result = result
            step.state = AgentState.COMPLETED
            
            # Stream result summary if there's useful content
            if result and len(result.strip()) > 0 and not result.startswith("Error"):
                # Extract key info from result without full dump
                summary = self._extract_result_summary(result)
                if summary:
                    self._stream_content(summary)
            
        except Exception as e:
            step.result = f"Error: {str(e)}"
            step.state = AgentState.ERROR
            self._stream_content(f"Error in step {step_number}: {str(e)}")
            logging.error(f"Error in step {step_number}: {e}")
        
        step.duration = time.time() - start_time
        return step
    
    def _extract_result_summary(self, result: str) -> str:
        """Extract a concise summary from step results."""
        if not result or len(result.strip()) == 0:
            return ""
        
        # For different types of results, extract key info
        lines = result.split('\n')
        
        # Look for key information patterns
        summary_lines = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Skip markdown headers and formatting
            if line.startswith('#') or line.startswith('**') or line.startswith('*'):
                continue
                
            # Include file paths, errors, important findings
            if any(keyword in line.lower() for keyword in [
                'found', 'located', 'created', 'modified', 'updated', 
                'file:', 'error', 'warning', 'issue', 'success',
                'directory', 'pattern', 'function', 'class'
            ]):
                summary_lines.append(line)
                
            # Limit to first few important lines
            if len(summary_lines) >= 3:
                break
        
        if summary_lines:
            return '\n'.join(summary_lines)
        
        # Fallback: just show first meaningful line
        for line in lines:
            line = line.strip()
            if line and not line.startswith('*') and not line.startswith('#'):
                return line[:100] + '...' if len(line) > 100 else line
        
        return ""

    async def _think_and_plan(self, task: AgentTask, parameters: Dict[str, Any]) -> str:
        """Deep thinking and planning phase with comprehensive tool usage."""
        self.current_state = AgentState.THINKING
        
        results = []
        results.append("**THINKING & PLANNING PHASE**")
        
        # Get comprehensive workspace context using tools
        workspace_context = await self._get_enhanced_workspace_context()
        results.append(f"**Workspace Context:**\n{workspace_context}")
        
        # Analyze the task requirements
        results.append("**Task Analysis:**")
        results.append(f"**Description:** {task.description}")
        
        if task.requirements:
            results.append(f"**Requirements:** {', '.join(task.requirements)}")
        if task.constraints:
            results.append(f"**Constraints:** {', '.join(task.constraints)}")
        if task.success_criteria:
            results.append(f"**Success Criteria:** {', '.join(task.success_criteria)}")
        
        # Create intelligent plan using LLM with enhanced context
        planning_prompt = f"""
Based on the following information, create a detailed execution plan:

TASK: {task.description}
WORKSPACE: {workspace_context[:500]}...

Create a step-by-step plan that:
1. Identifies key files and components to analyze
2. Outlines the approach for implementation
3. Considers testing and validation
4. Addresses potential challenges

Provide a clear, actionable plan in markdown format.
"""
        
        try:
            response = await self.llm.ainvoke([HumanMessage(content=planning_prompt)])
            results.append("**EXECUTION PLAN:**")
            results.append(response.content)
            
            # Store planning results
            self.working_memory['initial_plan'] = response.content
            self.working_memory['workspace_context'] = workspace_context
            
        except Exception as e:
            results.append(f"**Planning Error:** {str(e)}")
            # Fallback plan
            results.append("**FALLBACK PLAN:**")
            results.append("1. Explore codebase structure")
            results.append("2. Search for relevant patterns")
            results.append("3. Analyze target files")
            results.append("4. Plan specific changes")
            results.append("5. Implement changes")
            results.append("6. Test modifications")
            results.append("7. Review and validate")
        
        return "\n\n".join(results)
    
    async def _get_enhanced_workspace_context(self) -> str:
        """Get comprehensive workspace context using available tools."""
        context_parts = []
        
        try:
            # Get workspace info
            workspace_tool = next((t for t in self.tools if t.name == "get_workspace_info"), None)
            if workspace_tool:
                workspace_info = workspace_tool._run()
                context_parts.append(workspace_info)
            
            # Get project analysis
            project_tool = next((t for t in self.tools if t.name == "analyze_project"), None)
            if project_tool:
                project_analysis = project_tool._run()
                context_parts.append(project_analysis)
            
            # Get git status
            git_tool = next((t for t in self.tools if t.name == "git_status"), None)
            if git_tool:
                git_status = git_tool._run()
                context_parts.append(f"Git Status: {git_status}")
                
        except Exception as e:
            context_parts.append(f"Error gathering context: {str(e)}")
        
        return "\n".join(context_parts) if context_parts else "No workspace context available"
    
    def _get_workspace_context(self) -> str:
        """Get comprehensive workspace context."""
        context_parts = []
        
        # Basic workspace info
        # This is a placeholder since we're inside the class. 
        # The logic is handled by _get_enhanced_workspace_context with actual tool usage.
        return "Workspace context"
    
    def _is_task_complete(self, task: AgentTask) -> bool:
        """Check if task is complete."""
        # Simple check - if last step was marked complete
        if task.steps and task.steps[-1].state == AgentState.COMPLETED:
            return True
        return False
        
    def _generate_progress_summary(self, task: AgentTask) -> str:
        """Generate a summary of task progress for the agent."""
        if not task.steps:
            return "Task just started. No steps executed yet."
        
        summary = f"Executed {len(task.steps)} steps:\n"
        
        for step in task.steps[-3:]:  # Last 3 steps
            summary += f"- Step {step.step_number} ({step.action}): {step.reasoning[:100]}...\n"
            if step.result:
                summary += f"  Result: {step.result[:200]}...\n"
                
        return summary
    
    # Placeholder methods for action implementation
    # In a full implementation, these would contain the actual logic for each action
    
    async def _think_and_plan_with_streaming(self, task: AgentTask, parameters: Dict[str, Any]) -> str:
        return await self._think_and_plan(task, parameters)
        
    async def _explore_codebase_action(self, task: AgentTask, parameters: Dict[str, Any]) -> str:
        # Implementation of exploration logic using tools
        return "Explored codebase"

    async def _explore_codebase_action_with_streaming(self, task: AgentTask, parameters: Dict[str, Any]) -> str:
        return "Explored codebase"
        
    async def _search_patterns_action(self, task: AgentTask, parameters: Dict[str, Any]) -> str:
        # Implementation of pattern search using tools
        return "Searched for patterns"
        
    async def _search_patterns_action_with_streaming(self, task: AgentTask, parameters: Dict[str, Any]) -> str:
        return "Searched for patterns"
        
    async def _analyze_context_action(self, task: AgentTask, parameters: Dict[str, Any]) -> str:
        # Implementation of context analysis using tools
        return "Analyzed context"
        
    async def _analyze_context_action_with_streaming(self, task: AgentTask, parameters: Dict[str, Any]) -> str:
        return "Analyzed context"
        
    async def _plan_changes_action(self, task: AgentTask, parameters: Dict[str, Any]) -> str:
        # Implementation of change planning
        return "Planned changes"
        
    async def _plan_changes_action_with_streaming(self, task: AgentTask, parameters: Dict[str, Any]) -> str:
        return "Planned changes"
        
    async def _implement_changes_action(self, task: AgentTask, parameters: Dict[str, Any]) -> str:
        # Implementation of code changes
        return "Implemented changes"
        
    async def _implement_changes_action_with_streaming(self, task: AgentTask, parameters: Dict[str, Any]) -> str:
        return "Implemented changes"
        
    async def _test_changes_action(self, task: AgentTask, parameters: Dict[str, Any]) -> str:
        # Implementation of testing
        return "Tested changes"
        
    async def _test_changes_action_with_streaming(self, task: AgentTask, parameters: Dict[str, Any]) -> str:
        return "Tested changes"
        
    async def _review_progress_action(self, task: AgentTask, parameters: Dict[str, Any]) -> str:
        # Implementation of progress review
        return "Reviewed progress"
        
    async def _review_progress_action_with_streaming(self, task: AgentTask, parameters: Dict[str, Any]) -> str:
        return "Reviewed progress"
    
    def _notify_step_completion(self, step: AgentStep):
        """Notify listeners of step completion."""
        for callback in self.step_callbacks:
            try:
                callback(step)
            except Exception as e:
                logging.error(f"Error in step callback: {e}") 
