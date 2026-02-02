"""
Biscuit Tools for LangChain AI Agent
====================================

This module provides comprehensive, optimized tools for the AI agent.
Includes file operations, robust searching, and code modification.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import typing
from typing import ClassVar, List, Optional
from pathlib import Path

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

if typing.TYPE_CHECKING:
    from biscuit import App


# --- Input Schemas ---

class FileReadInput(BaseModel):
    file_path: str = Field(description="Path to the file to read")
    start_line: Optional[int] = Field(default=1, description="Start reading from this line (1-indexed)")
    end_line: Optional[int] = Field(default=None, description="Stop reading at this line (1-indexed)")

class FileWriteInput(BaseModel):
    file_path: str = Field(description="Path to the file to write")
    content: str = Field(description="Full content to write to the file")

class FileCreateInput(BaseModel):
    file_path: str = Field(description="Path to the new file")
    content: str = Field(description="Initial content for the file")

class ReplaceInFileInput(BaseModel):
    file_path: str = Field(description="Path to the file to modify")
    search_text: str = Field(description="Exact text chunk to find and replace")
    replacement_text: str = Field(description="New text to insert in place of search_text")
    allow_multiple: bool = Field(default=False, description="Allow replacing multiple occurrences")

class DirectoryListInput(BaseModel):
    directory_path: str = Field(description="Path to the directory to list")
    recursive: bool = Field(default=False, description="Recursively list subdirectories")

class SearchCodeInput(BaseModel):
    query: str = Field(description="Regex pattern or text to search for")
    file_pattern: str = Field(default="*", description="Glob pattern for files to search (e.g. *.py)")
    case_sensitive: bool = Field(default=False, description="Case sensitive search")

class ExecuteCommandInput(BaseModel):
    command: str = Field(description="Command to execute in terminal")
    cwd: str = Field(default="", description="Working directory for the command")

class GetWorkspaceInfoInput(BaseModel):
    pass

class GetActiveEditorInput(BaseModel):
    pass

class GetDirectoryTreeInput(BaseModel):
    directory_path: str = Field(default=".", description="Path to the directory to tree")
    max_depth: int = Field(default=2, description="Maximum depth to traverse")


# --- Tool Base Class ---

class BiscuitTool(BaseTool):
    """Base class for Biscuit tools."""
    base: typing.Any = None  # Injected by get_biscuit_tools
    
    # Allow arbitrary types for 'base' since it's the App instance
    class Config:
        arbitrary_types_allowed = True

    def _get_abs_path(self, path: str) -> str:
        """Resolve path relative to workspace active directory."""
        if os.path.isabs(path):
            return path
        
        base_dir = getattr(self.base, 'active_directory', os.getcwd())
        if not base_dir:
            base_dir = os.getcwd()
            
        return os.path.join(base_dir, path)

    def _shorten_output(self, text: str, max_chars: int = 4000) -> str:
        """Truncate specific output to avoid context overflow."""
        if len(text) <= max_chars:
            return text
        return text[:max_chars] + f"\n... (truncated {len(text)-max_chars} chars)"


# --- Tool Implementations ---

class FileReadTool(BiscuitTool):
    name: str = "read_file"
    description: str = "Read contents of a file. Can read specific line ranges."
    args_schema: ClassVar[type[BaseModel]] = FileReadInput

    def _run(self, file_path: str, start_line: int = 1, end_line: Optional[int] = None) -> str:
        try:
            path = self._get_abs_path(file_path)
            if not os.path.exists(path):
                return f"Error: File {file_path} does not exist."
            
            # Simple binary check
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
            except UnicodeDecodeError:
                return f"Error: File {file_path} appears to be binary."
            
            total_lines = len(lines)
            start_idx = max(0, start_line - 1)
            end_idx = end_line if end_line else total_lines
            
            content = "".join(lines[start_idx:end_idx])
            
            prefix = ""
            if start_line > 1 or end_line:
                prefix = f"Lines {start_line}-{end_idx} of {total_lines}:\n"
            
            return self._shorten_output(prefix + content)

        except Exception as e:
            return f"Error reading file: {e}"


class FileWriteTool(BiscuitTool):
    name: str = "write_file"
    description: str = "OVERWRITE entire file context. Use with caution."
    args_schema: ClassVar[type[BaseModel]] = FileWriteInput

    def _run(self, file_path: str, content: str) -> str:
        try:
            path = self._get_abs_path(file_path)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
                
            if hasattr(self.base, 'explorer'):
                try:
                    self.base.explorer.directory.refresh_root()
                except:
                    pass
                    
            return f"Successfully wrote {len(content)} chars to {file_path}"
        except Exception as e:
            return f"Error writing file: {e}"


class FileCreateTool(BiscuitTool):
    name: str = "create_file"
    description: str = "Create a new file. Fails if file exists."
    args_schema: ClassVar[type[BaseModel]] = FileCreateInput

    def _run(self, file_path: str, content: str) -> str:
        try:
            path = self._get_abs_path(file_path)
            if os.path.exists(path):
                return f"Error: File {file_path} already exists. Use write_file or replace_in_file."
            
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
                
            if hasattr(self.base, 'explorer'):
                try:
                    self.base.explorer.directory.refresh_root()
                except:
                    pass
                    
            return f"Created file {file_path}"
        except Exception as e:
            return f"Error creating file: {e}"


class ReplaceInFileTool(BiscuitTool):
    name: str = "replace_in_file"
    description: str = "Replace exact text chunk in a file. 'search_text' must match exactly."
    args_schema: ClassVar[type[BaseModel]] = ReplaceInFileInput

    def _run(self, file_path: str, search_text: str, replacement_text: str, allow_multiple: bool = False) -> str:
        try:
            path = self._get_abs_path(file_path)
            if not os.path.exists(path):
                return f"Error: File {file_path} does not exist."
            
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if search_text not in content:
                # Try sloppy match (ignore whitespace differences)
                # This is risky but helpful for agents. For now, strict.
                return f"Error: search_text not found in {file_path}. Ensure exact match."
            
            count = content.count(search_text)
            if count > 1 and not allow_multiple:
                return f"Error: search_text found {count} times. Set allow_multiple=True to replace all."
            
            new_content = content.replace(search_text, replacement_text)
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
                
            return f"Successfully replaced text in {file_path}"
        except Exception as e:
            return f"Error replacing text: {e}"


class DirectoryListTool(BiscuitTool):
    name: str = "list_directory"
    description: str = "List files in a directory."
    args_schema: ClassVar[type[BaseModel]] = DirectoryListInput

    def _run(self, directory_path: str, recursive: bool = False) -> str:
        try:
            path = self._get_abs_path(directory_path)
            if not os.path.exists(path) or not os.path.isdir(path):
                return f"Error: {directory_path} is not a valid directory."
            
            items = []
            
            if recursive:
                for root, _, files in os.walk(path):
                    # Skip common heavy dirs
                    if any(x in root for x in ['.git', 'node_modules', '__pycache__', 'venv', '.venv']):
                        continue
                        
                    rel_root = os.path.relpath(root, path)
                    if rel_root == ".": rel_root = ""
                    
                    for f in files:
                        items.append(os.path.join(rel_root, f))
                        if len(items) > 500: break
                    if len(items) > 500: break
            else:
                items = [f for f in os.listdir(path) if not f.startswith('.')]
                items.sort()
            
            output = "\n".join(items)
            return self._shorten_output(f"Files in {directory_path}:\n{output}")
        except Exception as e:
            return f"Error listing directory: {e}"


class SearchCodeTool(BiscuitTool):
    name: str = "search_code"
    description: str = "Search workspace for code pattern (regex supported)."
    args_schema: ClassVar[type[BaseModel]] = SearchCodeInput

    def _run(self, query: str, file_pattern: str = "*", case_sensitive: bool = False) -> str:
        try:
            cwd = getattr(self.base, 'active_directory', os.getcwd())
            
            # IMPROVEMENT: Use git grep if available and inside git repo
            use_git = False
            if os.path.exists(os.path.join(cwd, ".git")):
                use_git = True
            
            results = []
            
            if use_git:
                cmd = ["git", "grep", "-n", "-I"] # -n line num, -I ignore binary
                if not case_sensitive:
                    cmd.append("-i")
                cmd.append(query)
                if file_pattern and file_pattern != "*":
                    cmd.append("--")
                    cmd.append(file_pattern)
                
                try:
                    res = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding='utf-8')
                    if res.returncode == 0 and res.stdout:
                        return self._shorten_output(res.stdout)
                except:
                    pass # Fallback to python
            
            # Fallback Python Walk (Optimized)
            regex_flags = 0 if case_sensitive else re.IGNORECASE
            try:
                pattern = re.compile(query, regex_flags)
            except re.error:
                return f"Invalid regex: {query}"
                
            match_count = 0
            
            # Convert file_pattern glob to regex for filtering
            # Simple conversion: . -> \., * -> .*
            import fnmatch
            
            for root, dirs, files in os.walk(cwd):
                # Skip massive dirs
                dirs[:] = [d for d in dirs if d not in {'.git', 'node_modules', '__pycache__', 'venv', 'dist', 'build'}]
                
                for file in files:
                    if file_pattern and file_pattern != "*" and not fnmatch.fnmatch(file, file_pattern):
                        continue
                        
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, cwd)
                    
                    try:
                        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                            for idx, line in enumerate(f, 1):
                                if pattern.search(line):
                                    results.append(f"{rel_path}:{idx}: {line.strip()[:200]}")
                                    match_count += 1
                                    if match_count >= 100: break
                    except:
                        pass
                        
                if match_count >= 100: break
                
            if not results:
                return "No matches found."
                
            return self._shorten_output("\n".join(results))

        except Exception as e:
            return f"Error searching: {e}"


class ExecuteCommandTool(BiscuitTool):
    name: str = "execute_command"
    description: str = "Run terminal command."
    args_schema: ClassVar[type[BaseModel]] = ExecuteCommandInput

    def _run(self, command: str, cwd: str = "") -> str:
        try:
            working_dir = self._get_abs_path(cwd) if cwd else getattr(self.base, 'active_directory', os.getcwd())
            
            # Security: Prevent scary commands? 
            # For now, trust the agent, but usually we'd filter 'rm -rf /' etc.
            
            res = subprocess.run(
                command, 
                shell=True, 
                cwd=working_dir, 
                capture_output=True, 
                text=True,
                encoding='utf-8' # Force utf-8
            )
            
            output = f"Exit Code: {res.returncode}\n"
            if res.stdout:
                output += f"STDOUT:\n{res.stdout}\n"
            if res.stderr:
                output += f"STDERR:\n{res.stderr}\n"
                
            return self._shorten_output(output)
        except Exception as e:
            return f"Error executing command: {e}"


class GetWorkspaceInfoTool(BiscuitTool):
    name: str = "get_workspace_info"
    description: str = "Get info about current workspace and environment."
    args_schema: ClassVar[type[BaseModel]] = GetWorkspaceInfoInput

    def _run(self) -> str:
        cwd = getattr(self.base, 'active_directory', os.getcwd())
        files_root = len(os.listdir(cwd)) if os.path.exists(cwd) else 0
        
        info = [
            f"Active Directory: {cwd}",
            f"OS: {os.name}",
            f"Root Files/Dirs: {files_root}",
        ]
        
        if hasattr(self.base, 'git'):
            try:
                branch = self.base.git.active_branch
                info.append(f"Git Branch: {branch}")
            except:
                pass
                
        return "\n".join(info)


class GetActiveEditorTool(BiscuitTool):
    name: str = "get_active_editor"
    description: str = "Get the path and status of the currently focused editor."
    args_schema: ClassVar[type[BaseModel]] = GetActiveEditorInput

    def _run(self) -> str:
        try:
            if not hasattr(self.base, 'editorsmanager'):
                return "Error: Editors manager not available."
            
            editor = self.base.editorsmanager.active_editor
            if not editor:
                return "No active editor."
            
            if hasattr(editor, 'path') and editor.path:
                content_status = "unmodified"
                if hasattr(editor, 'content') and hasattr(editor.content, 'modified'):
                    content_status = "modified" if editor.content.modified else "unmodified"
                
                return f"Active Editor: {editor.path} ({content_status})"
            
            return "Active editor is not a file editor."
        except Exception as e:
            return f"Error getting active editor: {e}"


class GetDirectoryTreeTool(BiscuitTool):
    name: str = "get_directory_tree"
    description: str = "Get a visual tree of the directory structure (supports depth)."
    args_schema: ClassVar[type[BaseModel]] = GetDirectoryTreeInput

    def _run(self, directory_path: str = ".", max_depth: int = 2) -> str:
        try:
            path = self._get_abs_path(directory_path)
            if not os.path.exists(path) or not os.path.isdir(path):
                return f"Error: {directory_path} is not a valid directory."
            
            tree = []
            self._build_tree(path, "", tree, 0, max_depth)
            
            return self._shorten_output(f"Directory Tree of {directory_path}:\n" + "\n".join(tree))
        except Exception as e:
            return f"Error generating tree: {e}"

    def _build_tree(self, path: str, prefix: str, tree: List[str], depth: int, max_depth: int):
        if depth > max_depth:
            return

        try:
            items = os.listdir(path)
            items = [i for i in items if not i.startswith('.') and i not in {'.git', 'node_modules', '__pycache__', 'venv'}]
            items.sort()
            
            for i, item in enumerate(items):
                is_last = (i == len(items) - 1)
                full_path = os.path.join(path, item)
                is_dir = os.path.isdir(full_path)
                
                tree.append(f"{prefix}{'└── ' if is_last else '├── '}{item}{'/' if is_dir else ''}")
                
                if is_dir:
                    new_prefix = prefix + ("    " if is_last else "│   ")
                    self._build_tree(full_path, new_prefix, tree, depth + 1, max_depth)
        except:
            pass


# --- Registry ---

def get_biscuit_tools(base: App) -> List[BiscuitTool]:
    """Return list of essential, optimized tools."""
    tools = [
        FileReadTool(),
        FileWriteTool(),
        FileCreateTool(),
        ReplaceInFileTool(),
        DirectoryListTool(),
        SearchCodeTool(),
        ExecuteCommandTool(),
        GetWorkspaceInfoTool(),
        GetActiveEditorTool(),
        GetDirectoryTreeTool(),
    ]
    
    for tool in tools:
        tool.base = base
        
    return tools
