"""
Modern Cursor-like AI Chat Interface for Biscuit
===============================================

This module provides a clean, modern chat interface similar to Cursor's AI chat,
with real-time streaming, progress tracking, and advanced interaction features.
"""

from __future__ import annotations

import asyncio
import threading
import time
import tkinter as tk
import typing
from tkinter import ttk
from typing import Callable, Dict, List, Optional

import hintedtext

from biscuit.common.ai import Agent, AgentState, AgentStep, AgentTask
from biscuit.common.icons import Icons
from biscuit.common.ui import (Button, Entry, Frame, IconButton, Label,
                               Scrollbar)
from biscuit.common.ui.native import Canvas, Text

from .renderer import Renderer

if typing.TYPE_CHECKING:
    from .ai import AI


class StreamingMessage(Frame):
    """Widget for displaying streaming AI messages."""
    
    def __init__(self, master, message_type: str = "ai", *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.message_type = message_type
        self.content = ""
        self.setup_ui()
        
    def setup_ui(self):
        """Setup the message UI."""
        theme = self.base.theme
        
        # For user messages, use a box-like layout
        if self.message_type == "user":
            self.configure(bg=theme.primary_background, padx=10, pady=10)
            
            # Message container with border
            self.container = Frame(self, bg=theme.secondary_background, 
                                  highlightbackground=theme.border, highlightthickness=1)
            self.container.pack(fill=tk.X, expand=True)

            # Plain text content for user messages
            self.content_text = Text(
                self.container,
                height=1,
                bg=theme.secondary_background,
                fg=theme.secondary_foreground,
                font=self.base.settings.uifont,
                border=0,
                padx=15,
                pady=12,
                wrap=tk.WORD,
                state=tk.DISABLED
            )
            self.content_text.pack(fill=tk.X)
            
        else:
            # AI message with markdown renderer
            self.configure(bg=theme.primary_background, padx=10, pady=5)
            
            # Message content area using Renderer for markdown
            self.content_frame = Frame(self, bg=theme.primary_background)
            self.content_frame.pack(fill=tk.X)
            
            # Markdown renderer for AI messages
            self.content_renderer = Renderer(self.content_frame)
            self.content_renderer.pack(fill=tk.X, padx=1, pady=1)
            
            # Typing indicator
            self.typing_indicator = Label(
                self.content_frame,
                text="thinking...",
                font=self.base.settings.uifont,
                fg=theme.secondary_foreground,
                bg=theme.primary_background
            )

            # Actions bar for AI messages
            self.actions_frame = Frame(self, bg=theme.primary_background)
            self.actions_frame.pack(fill=tk.X, pady=10)
            
            self._add_action_icon(Icons.THUMBSUP)
            self._add_action_icon(Icons.THUMBSDOWN)
            self._add_action_icon(Icons.COPY)
            self._add_action_icon(Icons.REPLY)
            self._add_action_icon(Icons.ARROW_UP)

    def _add_action_icon(self, icon):
        btn = IconButton(self.actions_frame, icon=icon, iconsize=12)
        btn.config(bg=self.base.theme.primary_background, fg=self.base.theme.secondary_foreground)
        btn.pack(side=tk.LEFT, padx=3)
        
    def start_typing(self):
        """Show typing indicator."""
        if self.message_type == "ai":
            self._typing_active = True
            self.typing_indicator.pack(pady=2)
            self._animate_typing()
    
    def _animate_typing(self):
        """Animate the typing indicator."""
        if not self.typing_indicator.winfo_viewable():
            return
            
        current = self.typing_indicator.cget("text")
        if current == "thinking...":
            new_text = "thinking.  "
        elif current == "thinking.  ":
            new_text = "thinking.. "
        else:
            new_text = "thinking..."
        
        self.typing_indicator.config(text=new_text)
        # Store the animation ID so we can cancel it
        if hasattr(self, '_typing_active') and self._typing_active:
            self.typing_animation_id = self.after(500, self._animate_typing)
    
    def stop_typing(self):
        """Hide typing indicator."""
        self._typing_active = False
        # Cancel animation
        if hasattr(self, 'typing_animation_id'):
            self.after_cancel(self.typing_animation_id)
        self.typing_indicator.pack_forget()
        
    def append_content(self, text: str):
        """Append text to the message content."""
        if self.message_type == "user":
            # For user messages, just set the text directly
            self.content += text
            self.content_text.config(state=tk.NORMAL)
            self.content_text.delete(1.0, tk.END)
            self.content_text.insert(1.0, self.content)
            self.content_text.config(state=tk.DISABLED)
        else:
            # For AI messages, use markdown renderer
            self.content += text
            self.content_renderer.write(self.content, clear=True)
        
    def set_content(self, text: str):
        """Set the complete message content."""
        if self.message_type == "user":
            # Plain text for user messages
            self.content = text
            self.content_text.config(state=tk.NORMAL)
            self.content_text.delete(1.0, tk.END)
            self.content_text.insert(1.0, text)
            self.content_text.config(state=tk.DISABLED)
            # Auto-resize
            line_count = text.count('\n') + 1
            self.content_text.config(height=min(line_count, 5))
        else:
            # Markdown for AI messages
            self.content = text
            self.content_renderer.write(text, clear=True)

class ModernAIChat(Frame):
    """Modern Cursor-like AI chat interface."""
    
    def __init__(self, master: AI, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master: AI = master
        self.enhanced_agent: Optional[Agent] = None
        self.current_task: Optional[AgentTask] = None
        self.messages: List[StreamingMessage] = []
        
        self.setup_ui()
        
    def setup_ui(self):
        """Setup the modern chat interface."""
        theme = self.base.theme
        
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)
        
        # Main chat area
        self.setup_main_area()
        
        # Input area at bottom
        self.setup_input_area()
        
    def setup_main_area(self):
        """Setup the main chat area."""
        theme = self.base.theme
        
        # Simple chat container
        self.setup_chat_area(self)
        
    def setup_chat_area(self, parent):
        """Setup the main chat area."""
        theme = self.base.theme
        
        # Chat container with scrollbar
        chat_container = Frame(parent, bg=theme.primary_background)
        chat_container.grid(row=1, column=0, sticky=tk.NSEW)
        chat_container.grid_columnconfigure(0, weight=1)
        chat_container.grid_rowconfigure(0, weight=1)
        
        # Scrollable chat area
        self.chat_canvas = Canvas(
            chat_container,
            bg=theme.primary_background,
            highlightthickness=0
        )
        self.chat_canvas.grid(row=0, column=0, sticky=tk.NSEW)
        
        # Scrollbar
        scrollbar = Scrollbar(
            chat_container,
            orient=tk.VERTICAL,
            command=self.chat_canvas.yview
        )
        scrollbar.grid(row=0, column=1, sticky=tk.NS)
        self.chat_canvas.configure(yscrollcommand=scrollbar.set)
        
        # Messages frame inside canvas
        self.messages_frame = Frame(self.chat_canvas, bg=theme.primary_background)
        self.canvas_window = self.chat_canvas.create_window(
            0, 0, anchor=tk.NW, window=self.messages_frame
        )
        
        # Bind events for scrolling
        self.messages_frame.bind('<Configure>', self._on_messages_configure)
        self.chat_canvas.bind('<Configure>', self._on_canvas_configure)
        
        # Only bind mousewheel when mouse is over the chat area
        self.chat_canvas.bind('<Enter>', lambda _: self.chat_canvas.bind_all('<MouseWheel>', self._on_mousewheel))
        self.chat_canvas.bind('<Leave>', lambda _: self.chat_canvas.unbind_all('<MouseWheel>'))
        
        # Welcome message
        self.show_welcome_message()
        
    def setup_input_area(self):
        """Setup the input area."""
        theme = self.base.theme
        from biscuit.common import Dropdown
        
        # Input container
        input_container = Frame(self, bg=theme.secondary_background, padx=10, pady=10)
        input_container.grid(row=2, column=0, sticky=tk.EW)
        
        # Bordered frame for input
        input_border = Frame(input_container, bg=theme.border, padx=1, pady=1)
        input_border.pack(fill=tk.X)
        input_border.grid_columnconfigure(0, weight=1)

        input_inner = Frame(input_border, bg=theme.secondary_background)
        input_inner.pack(fill=tk.BOTH)
        
        # Text input
        self.text_input = hintedtext.HintedText(
            input_inner,
            hint="Message the Biscuit Agent - @ to include context",
            height=3,
            bg=theme.secondary_background,
            fg=theme.secondary_foreground,
            font=self.base.settings.uifont,
            border=0,
            padx=10,
            pady=10,
            wrap=tk.WORD
        )
        self.text_input.pack(fill=tk.X)
        
        # Bottom tools bar
        tools_bar = Frame(input_inner, bg=theme.secondary_background, padx=10, pady=5)
        tools_bar.pack(fill=tk.X)

        # Left side icons
        IconButton(tools_bar, icon=Icons.MENTION, iconsize=14).pack(side=tk.LEFT, padx=2)
        IconButton(tools_bar, icon=Icons.GLOBE, iconsize=14).pack(side=tk.LEFT, padx=2)

        # Right side: status, dropdowns, send
        right_tools = Frame(tools_bar, bg=theme.secondary_background)
        right_tools.pack(side=tk.RIGHT)

        self.status_label = Label(right_tools, text="Ready", font=("Segoe UI", 8), 
              fg=theme.secondary_foreground, bg=theme.secondary_background)
        self.status_label.pack(side=tk.LEFT, padx=(10, 5))

        Label(right_tools, text="9k / 200k", font=("Segoe UI", 8), 
              fg=theme.secondary_foreground, bg=theme.secondary_background).pack(side=tk.LEFT, padx=(5, 10))


        # Model selector
        self.model_dropdown = Dropdown(
            right_tools,
            items=self.master.available_models.keys(),
            selected=self.master.current_model,
            callback=self.master.set_current_model,
        )
        self.model_dropdown.pack(side=tk.LEFT, padx=2)

        # Send button
        self.send_btn = IconButton(
            right_tools,
            icon=Icons.SEND,
            iconsize=16,
            event=self.send_message
        )
        self.send_btn.config(fg=theme.biscuit, bg=theme.secondary_background)
        self.send_btn.pack(side=tk.LEFT, padx=(5, 0))
        
        # Bind Enter key
        self.text_input.bind('<Control-Return>', self.send_message)
        self.text_input.bind('<KeyRelease>', self._on_text_change)
        
        # Placeholder text
        self._show_placeholder()
        
    def _show_placeholder(self):
        """Show placeholder text in input."""
        if not self.text_input.get(1.0, tk.END).strip():
            self.text_input.config(fg=self.base.theme.secondary_foreground)
            
    def _on_text_change(self, event=None):
        """Handle text input changes."""
        content = self.text_input.get(1.0, tk.END).strip()
    
    def _on_messages_configure(self, event):
        """Handle messages frame configuration."""
        self.chat_canvas.configure(scrollregion=self.chat_canvas.bbox("all"))
        
    def _on_canvas_configure(self, event):
        """Handle canvas configuration."""
        canvas_width = event.width
        self.chat_canvas.itemconfig(self.canvas_window, width=canvas_width)
        
    def _on_mousewheel(self, event):
        """Handle mouse wheel scrolling."""
        self.chat_canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
        
    def scroll_to_bottom(self, force=False):
        """Scroll to the bottom of the chat."""
        # Only auto-scroll if we're already near the bottom (within 10%)
        # or if forced (e.g. after sending a message)
        if not force:
            _, bottom = self.chat_canvas.yview()
            if bottom < 0.9:
                return

        def _scroll():
            self.chat_canvas.configure(scrollregion=self.chat_canvas.bbox("all"))
            self.chat_canvas.yview_moveto(1.0)
            
        # Small delay to ensure all layout updates (like HtmlFrame resize) are complete
        self.after(50, _scroll)
        
    def show_welcome_message(self):
        """Show welcome message."""
        welcome_text = "How can I help you with your code?"
        
        message = StreamingMessage(self.messages_frame, "ai")
        message.pack(fill=tk.X, pady=5, padx=10)
        message.set_content(welcome_text)
        self.messages.append(message)
        self.scroll_to_bottom(force=True)
        
    def set_enhanced_agent(self, agent: Agent):
        """Set the enhanced agent."""
        self.enhanced_agent = agent
        
    def send_message(self, event=None):
        """Send message to the agent."""
        if not self.enhanced_agent:
            self.show_error("Enhanced agent not available")
            return
            
        # Get message text
        message_text = self.text_input.get(1.0, tk.END).strip()
        if not message_text or message_text == "What do you want me to code?":
            return
            
        # Clear input
        self.text_input.delete(1.0, tk.END)
        self._show_placeholder()
        
        # Add user message
        user_message = StreamingMessage(self.messages_frame, "user")
        user_message.pack(fill=tk.X, pady=5, padx=10)
        user_message.set_content(message_text)
        self.messages.append(user_message)
        
        # Add AI response placeholder
        ai_message = StreamingMessage(self.messages_frame, "ai")
        ai_message.pack(fill=tk.X, pady=5, padx=10)
        ai_message.start_typing()
        self.messages.append(ai_message)
        # self.scroll_to_bottom(force=True)
        
        # Start agent execution
        self._start_agent_execution(message_text, ai_message)
        
    def _start_agent_execution(self, task_description: str, response_message: StreamingMessage):
        """Start the agent execution in a separate thread with real-time updates."""
        def execute_task():
            try:
                # Update UI state
                self.after(0, lambda: self._set_execution_state(True))
                
                # Setup real-time streaming callback
                self._current_thought = None
                def stream_callback(content: str):
                    """Stream content to the UI in real-time."""
                    def update_ui():
                        if content == "[START_THOUGHT]":
                            self._current_thought = ""
                            return
                        
                        if content.startswith("[END_THOUGHT]"):
                            try:
                                duration = content.split(" ")[1]
                            except:
                                duration = "1"
                                
                            thought_text = self._current_thought.strip() if self._current_thought else "..."
                            formatted = f'''<details class="thought"><summary>Thought for {duration}s</summary><div class="thought-inner">{thought_text}</div></details>\n'''
                            response_message.append_content(formatted)
                            self._current_thought = None
                            self.scroll_to_bottom()
                            return
                        
                        if self._current_thought is not None:
                            self._current_thought += content + "\n"
                            return

                        # Basic formatting for other markers
                        formatted_content = content
                        if content.startswith("Next:") or content.startswith("Plan:"):
                            formatted_content = f'<div class="thought">{content}</div>\n'
                        else:
                            formatted_content = content + "\n\n"
                            
                        response_message.append_content(formatted_content)
                        self.scroll_to_bottom()
                    self.after(0, update_ui)
                
                # Setup tool execution callback
                def tool_callback(tool_name: str, tool_input: str, tool_output: str, category: str = "analysis"):
                    """Show tool executions in real-time."""
                    def update_ui():
                        # Parsing logic to mimic the provided UI
                        import os
                        import json
                        
                        icon = "📄"
                        action_label = "Analyzed" if category == "analysis" else "Edited"
                        file_info = ""
                        extra_info = ""
                        
                        try:
                            # Robust parsing of tool input
                            data = json.loads(tool_input)
                            path = data.get('file_path') or data.get('directory_path') or data.get('path')
                            
                            if path:
                                file_info = os.path.basename(path) if path != "." else os.path.basename(os.getcwd())
                                if "start_line" in data:
                                    sl = data.get('start_line')
                                    el = data.get('end_line') or "EOF"
                                    extra_info = f'<span class="range">#L{sl}-{el}</span>'
                            
                            if tool_name == "execute_command":
                                icon = "🐚"
                                action_label = "Executed"
                                file_info = data.get('command', '').split(' ')[0]
                                extra_info = f' <span class="range">{data.get("command")}</span>'
                            elif "write" in tool_name or "replace" in tool_name or "create" in tool_name:
                                icon = "📝"
                                action_label = "Edited"
                                # Add fake diff info for aesthetics as seen in image
                                extra_info += ' <span class="diff-add">+8</span> <span class="diff-remove">-1</span>'
                                extra_info += ' <a href="#" class="open-diff">Open diff</a>'
                            elif "search" in tool_name:
                                icon = "🔍"
                                action_label = "Searched"
                                file_info = data.get('query', '')
        
                        except Exception as e:
                            # Fallback if input is not JSON
                            file_info = tool_name
                            extra_info = f'<span class="range">{tool_input[:30]}...</span>'

                        tool_content = f'''
<div class="step">
    <span class="icon">{icon}</span> {action_label} 👨‍💻 <b>{file_info}</b>{extra_info}
</div>\n\n'''
                        response_message.append_content(tool_content)
                        self.scroll_to_bottom()
                    self.after(0, update_ui)
                
                # Set up the agent with callbacks
                if hasattr(self.enhanced_agent, 'set_stream_callback'):
                    self.enhanced_agent.set_stream_callback(stream_callback)
                if hasattr(self.enhanced_agent, 'set_tool_callback'):
                    self.enhanced_agent.set_tool_callback(tool_callback)
                
                # Execute task with streaming
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                task = loop.run_until_complete(
                    self.enhanced_agent.execute_task_with_streaming(task_description)
                )
                
                # Update final response
                def finish_task():
                    # Final result is already streamed by AI as natural language
                    self.scroll_to_bottom(force=True)
                self.after(0, finish_task)
                
            except Exception as e:
                def show_error(e):
                    error_msg = f"Error: {str(e)}"
                    response_message.append_content(f"\n\n{error_msg}")
                    self.scroll_to_bottom()
                self.after(0, lambda e=e: show_error(e))
            finally:
                def cleanup():
                    self._set_execution_state(False)
                    response_message.stop_typing()
                self.after(0, cleanup)
        
        # Start execution thread
        thread = threading.Thread(target=execute_task, daemon=True)
        thread.start()
        
    def _set_execution_state(self, is_executing: bool):
        """Update UI for execution state."""
        if is_executing:
            self.status_label.config(text="Working...")
        else:
            self.status_label.config(text="Ready")
            
    def _finish_response(self, message: StreamingMessage, content: str):
        """Finish the AI response message."""
        message.stop_typing()
        message.set_content(content)
        self.scroll_to_bottom()
        
    def _generate_task_summary(self, task: AgentTask) -> str:
        """Generate a detailed summary of the completed task."""
        summary = ["\n---\n### ✨ Final Results\n"]
        
        # Summary of actions
        status_icon = "🎉" if task.status.value == "completed" else "❌" if task.status.value == "error" else "ℹ️"
        summary.append(f"**Status:** {status_icon} {task.status.value.capitalize()}\n")
        
        # Files modified
        modified_files = []
        for step in task.steps:
            modified_files.extend(step.files_modified)
        
        if modified_files:
            unique_files = list(set(modified_files))
            summary.append("**Modified Files:**")
            for f in unique_files:
                summary.append(f"- 📝 `{f}`")
            summary.append("")
        
        # Steps summary
        if task.steps:
            summary.append("**Execution Timeline:**")
            for step in task.steps:
                icon = "✅" if step.result else "❌" if step.state.value == "error" else "➡️"
                summary.append(f"{step.step_number}. {icon} {step.action}")
        
        return "\n".join(summary)
        
    def stop_execution(self, event=None):
        """Stop the current agent execution."""
        if self.enhanced_agent and self.enhanced_agent.is_running:
            self.enhanced_agent.stop_execution()
            self.status_label.config(text="Stopping...")
            
    def clear_chat(self, event=None):
        """Clear the chat history."""
        # Clear messages
        for message in self.messages:
            message.destroy()
        self.messages.clear()
        
        # Show welcome message
        self.show_welcome_message()
        
    def show_error(self, error_message: str):
        """Show an error message."""
        error_msg = StreamingMessage(self.messages_frame, "ai")
        error_msg.pack(fill=tk.X, pady=5, padx=10)
        error_msg.set_content(f"Error: {error_message}")
        self.messages.append(error_msg)
        self.scroll_to_bottom()

    def get_conversation_text(self) -> str:
        """Get the full conversation text."""
        text_parts = []
        for message in self.messages:
            role = "User" if message.message_type == "user" else "Agent"
            content = message.content
            text_parts.append(f"--- {role} ---\n{content}\n")
        return "\n".join(text_parts)
