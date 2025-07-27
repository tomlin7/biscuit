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
        
        # For user messages, use simple text widget
        if self.message_type == "user":
            # Simple header for user messages
            header = Frame(self, bg=theme.secondary_background)
            header.pack(fill=tk.X)

            self.configure(bg=theme.secondary_background)
            
            sender_label = Label(
                header,
                text="You",
                font=self.base.settings.uifont,
                fg=theme.secondary_foreground,
                bg=theme.secondary_background
            )
            sender_label.pack(side=tk.LEFT)
            
            # Plain text content for user messages
            self.content_text = Text(
                self,
                height=1,
                bg=theme.secondary_background,
                fg=theme.secondary_foreground,
                font=self.base.settings.uifont,
                border=0,
                wrap=tk.WORD,
                state=tk.DISABLED
            )
            self.content_text.pack(fill=tk.X, pady=(0, 2))
            
        else:
            # AI message with markdown renderer
            header = Frame(self, bg=theme.secondary_background)
            header.pack(fill=tk.X)
            
            sender_label = Label(
                header,
                text="Agent",
                font=self.base.settings.uifont,
                fg=theme.biscuit,
                bg=theme.secondary_background
            )
            sender_label.pack(side=tk.LEFT)
            
            # Message content area using Renderer for markdown
            self.content_frame = Frame(self, bg=theme.secondary_background)
            self.content_frame.pack(fill=tk.X, pady=(0, 2))
            
            # Markdown renderer for AI messages
            self.content_renderer = Renderer(self.content_frame)
            self.content_renderer.pack(fill=tk.X, padx=1, pady=1)
            
            # Typing indicator
            self.typing_indicator = Label(
                self.content_frame,
                text="thinking...",
                font=self.base.settings.uifont,
                fg=theme.secondary_foreground,
                bg=theme.secondary_background
            )
        
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
        
        # Header with mode and controls
        self.setup_header()
        
        # Main chat area
        self.setup_main_area()
        
        # Input area at bottom
        self.setup_input_area()
        
    def setup_header(self):
        """Setup the header area."""
        theme = self.base.theme
        
        header = Frame(self, bg=theme.secondary_background)
        header.grid(row=0, column=0, sticky=tk.EW, padx=5, pady=5)
        header.grid_columnconfigure(0, weight=1)
        
        # Simple status indicator
        self.status_label = Label(
            header,
            text="Ready",
            font=self.base.settings.uifont,
            fg=theme.secondary_foreground,
            bg=theme.secondary_background
        )
        self.status_label.pack(side=tk.LEFT)
        
    def setup_main_area(self):
        """Setup the main chat area."""
        theme = self.base.theme
        
        # Simple chat container
        self.setup_chat_area(self)
        
    def setup_chat_area(self, parent):
        """Setup the main chat area."""
        theme = self.base.theme
        
        # Chat container with scrollbar
        chat_container = Frame(parent, bg=theme.secondary_background)
        chat_container.grid(row=1, column=0, sticky=tk.NSEW)
        chat_container.grid_columnconfigure(0, weight=1)
        chat_container.grid_rowconfigure(0, weight=1)
        
        # Scrollable chat area
        self.chat_canvas = Canvas(
            chat_container,
            bg=theme.secondary_background,
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
        self.messages_frame = Frame(self.chat_canvas, bg=theme.secondary_background)
        self.canvas_window = self.chat_canvas.create_window(
            0, 0, anchor=tk.NW, window=self.messages_frame
        )
        
        # Bind events for scrolling
        self.messages_frame.bind('<Configure>', self._on_messages_configure)
        self.chat_canvas.bind('<Configure>', self._on_canvas_configure)
        self.chat_canvas.bind_all('<MouseWheel>', self._on_mousewheel)
        
        # Welcome message
        self.show_welcome_message()
        
    def setup_input_area(self):
        """Setup the input area."""
        theme = self.base.theme
        
        # Input container
        input_container = Frame(self, bg=theme.border)
        input_container.grid(row=2, column=0, sticky=tk.EW, pady=(5, 0))
        input_container.grid_columnconfigure(0, weight=1)
        
        # Input frame
        input_frame = Frame(input_container, bg=theme.secondary_background)
        input_frame.pack(fill=tk.X, padx=1, pady=1)
        
        # Text input
        self.text_input = hintedtext.HintedText(
            input_frame,
            hint="What do you want me to code?",
            height=3,
            bg=theme.secondary_background,
            fg=theme.secondary_foreground,
            font=self.base.settings.uifont,
            border=0,
            padx=10,
            pady=10,
            wrap=tk.WORD
        )
        self.text_input.pack(fill=tk.X, side=tk.LEFT, expand=True)
        
        # Send button
        self.send_btn = IconButton(
            input_frame,
            icon=Icons.SEND,
            event=self.send_message
        )
        self.send_btn.config(
            fg=theme.biscuit,
            bg=theme.secondary_background,
            padx=10,
            pady=10
        )
        self.send_btn.pack(side=tk.RIGHT, fill=tk.Y)
        
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
        
    def scroll_to_bottom(self):
        """Scroll to the bottom of the chat."""
        self.chat_canvas.update_idletasks()
        self.chat_canvas.yview_moveto(1.0)
        
    def show_welcome_message(self):
        """Show welcome message."""
        welcome_text = "How can I help you with your code?"
        
        message = StreamingMessage(self.messages_frame, "ai")
        message.pack(fill=tk.X, pady=5, padx=10)
        message.set_content(welcome_text)
        self.messages.append(message)
        
        self.scroll_to_bottom()
        
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
        
        self.scroll_to_bottom()
        
        # Start agent execution
        self._start_agent_execution(message_text, ai_message)
        
    def _start_agent_execution(self, task_description: str, response_message: StreamingMessage):
        """Start the agent execution in a separate thread with real-time updates."""
        def execute_task():
            try:
                # Update UI state
                self.after(0, lambda: self._set_execution_state(True))
                
                # Setup real-time streaming callback
                def stream_callback(content: str):
                    """Stream content to the UI in real-time."""
                    def update_ui():
                        response_message.append_content(content + "\n\n")
                        self.scroll_to_bottom()
                    self.after(0, update_ui)
                
                # Setup tool execution callback
                def tool_callback(tool_name: str, tool_input: str, tool_output: str):
                    """Show tool executions in real-time."""
                    def update_ui():
                        tool_content = f"Executed: {tool_name}\n\n"
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
                    final_response = self._generate_task_summary(task)
                    response_message.append_content(f"\n\n---\n\n{final_response}")
                    self.scroll_to_bottom()
                self.after(0, finish_task)
                
            except Exception as e:
                def show_error():
                    error_msg = f"Error: {str(e)}"
                    response_message.append_content(f"\n\n{error_msg}")
                    self.scroll_to_bottom()
                self.after(0, show_error)
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
        """Generate a minimal summary of the completed task."""
        # Just show modified files if any
        modified_files = []
        for step in task.steps:
            modified_files.extend(step.files_modified)
        
        if modified_files:
            unique_files = list(set(modified_files))
            if len(unique_files) == 1:
                return f"Modified: {unique_files[0]}"
            elif len(unique_files) <= 3:
                return "Modified: " + ", ".join(unique_files)
            else:
                return f"Modified {len(unique_files)} files"
        
        return "Done"
        
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
