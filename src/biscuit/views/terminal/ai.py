from __future__ import annotations

import typing

from biscuit.common.ai import Agent

if typing.TYPE_CHECKING:
    from .terminalbase import TerminalBase


class AI:
    def __init__(self, terminal: TerminalBase) -> None:
        self.terminal = terminal
        self.base = terminal.base
        self.agent = None

        self.system_prompt = f"""You are an autonomous coding assistant with full access to the Biscuit editor environment. You are an expert at terminal commands, code analysis, and project understanding.

You can use the ReAct (Reasoning, Action, Result) approach to solve complex problems:
1. **Reason** about what you need to do
2. **Act** by using available tools 
3. **Observe** the results
4. Repeat until the task is complete

Available capabilities:
- Read and analyze files in the workspace
- Open files in the editor at specific lines
- Search through code and project structure
- Execute terminal commands
- Create and modify files
- Explore the project to understand its structure and purpose

Current environment:
- Shell: {self.terminal.shell} ({self.terminal.name})
- System: {str(self.base.system)}
- Workspace: {getattr(self.base, 'active_directory', 'No workspace open')}

When helping with terminal commands, you can:
1. First explore the project structure to understand context
2. Analyze relevant files if needed
3. Provide the most appropriate command
4. Explain your reasoning if helpful

You have full autonomy to use any tools needed to understand the project and provide the best assistance."""

        # Initialize AI agent if API key is available
        self._initialize_agent()

    def _initialize_agent(self) -> None:
        """Initialize the AI agent for terminal assistance."""
        try:
            # Get API key from the main AI view
            if hasattr(self.base, 'sidebar') and hasattr(self.base.sidebar, 'ai'):
                ai_view = self.base.sidebar.ai
                if hasattr(ai_view, 'api_key') and ai_view.api_key:
                    # Create agent with AGENT mode (full tool access for autonomous operation)
                    self.agent = Agent(
                        base=self.base,
                        api_key=ai_view.api_key,
                        model_name=ai_view.available_models.get(ai_view.current_model, "gemini-2.0-flash-exp")
                    )
                    return
        except Exception:
            pass
        
        # Agent not available
        self.agent = None

    def get_response(self, err_command: str) -> str:
        """Get AI response for terminal command correction/generation."""
        try:
            # Try to initialize agent if not available
            if not self.agent:
                self._initialize_agent()
            
            if not self.agent:
                # Fallback: show message to configure AI
                if hasattr(self.base, 'notifications'):
                    self.base.notifications.error(
                        "AI assistant not configured. Please set up API key in AI view.",
                        actions=[
                            (
                                "Configure AI",
                                lambda: self.base.sidebar.show_ai().add_placeholder() if hasattr(self.base, 'sidebar') else None,
                            )
                        ],
                    )
                return None
            
            # Prepare the message with context
            message = f"{self.system_prompt}\n\nInput from user: {err_command}"
            
            # Get response from agent
            response = self.agent.process_message(message)
            
            if response and response.strip():
                # Show the suggested command in palette
                if hasattr(self.base, 'palette'):
                    self.base.palette.show("runc:", response.strip())
                return response.strip()
            
        except Exception as e:
            if hasattr(self.base, 'logger'):
                self.base.logger.error(f"Terminal AI error: {e}")
            elif hasattr(self.base, 'notifications'):
                self.base.notifications.error(
                    "Error occurred while fetching AI response. Please try again.",
                    actions=[
                        (
                            "Configure AI",
                            lambda: self.base.sidebar.show_ai().add_placeholder() if hasattr(self.base, 'sidebar') else None,
                        )
                    ],
                )
        
        return None
