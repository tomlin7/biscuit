"""
Biscuit Tools for LangChain AI Agent
====================================

This module provides comprehensive tools that allow the AI agent to interact with 
Biscuit's internal components and functionality. Includes file operations, code analysis,
git operations, project management, and more.
"""

from __future__ import annotations

import ast
import json
import os
import re
import subprocess
import tempfile
import typing
from pathlib import Path

from git import Optional
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

if typing.TYPE_CHECKING:
    from biscuit import App


class FileReadInput(BaseModel):
    """Input for reading a file."""
    file_path: str = Field(description="Path to the file to read")


class FileWriteInput(BaseModel):
    """Input for writing to a file."""
    file_path: str = Field(description="Path to the file to write")
    content: str = Field(description="Content to write to the file")


class FileCreateInput(BaseModel):
    """Input for creating a new file."""
    file_path: str = Field(description="Path to the new file")
    content: str = Field(description="Initial content for the file")


class DirectoryListInput(BaseModel):
    """Input for listing directory contents."""
    directory_path: str = Field(description="Path to the directory to list")
    show_hidden: bool = Field(default=False, description="Show hidden files and directories")
    show_details: bool = Field(default=False, description="Show file sizes and modification times")


class SearchCodeInput(BaseModel):
    """Input for searching code in the workspace."""
    query: str = Field(description="Search query/pattern (supports regex)")
    file_extension: str = Field(default="", description="File extension to filter by (optional, e.g., '.py', '.js')")
    include_pattern: str = Field(default="", description="Include files matching this pattern (optional)")
    exclude_pattern: str = Field(default="", description="Exclude files matching this pattern (optional)")
    case_sensitive: bool = Field(default=False, description="Case sensitive search")
    max_results: int = Field(default=50, description="Maximum number of results to return")


class OpenFileInput(BaseModel):
    """Input for opening a file in the editor."""
    file_path: str = Field(description="Path to the file to open")
    line_number: int = Field(default=1, description="Line number to jump to (optional)")


class ExecuteCommandInput(BaseModel):
    """Input for executing a terminal command."""
    command: str = Field(description="Command to execute")
    working_directory: str = Field(default="", description="Working directory (optional)")


class GetActiveEditorInput(BaseModel):
    """Input for getting active editor info."""
    pass


class GetWorkspaceInfoInput(BaseModel):
    """Input for getting workspace information."""
    pass


class FileReadRangeInput(BaseModel):
    """Input for reading a specific range of lines from a file."""
    file_path: str = Field(description="Path to the file to read")
    start_line: int = Field(description="Starting line number (1-indexed)")
    end_line: int = Field(description="Ending line number (1-indexed)")


class OpenNewEditorInput(BaseModel):
    """Input for opening a new empty editor."""
    file_name: str = Field(default="untitled", description="Name for the new file (optional)")


class GetDirectoryTreeInput(BaseModel):
    """Input for getting directory tree structure."""
    directory_path: str = Field(description="Path to the directory")
    max_depth: int = Field(default=3, description="Maximum depth to traverse")


class ProjectExplorationInput(BaseModel):
    """Input for comprehensive project exploration."""
    include_file_analysis: bool = Field(default=True, description="Include detailed file type analysis")
    include_structure: bool = Field(default=True, description="Include directory structure")
    max_depth: int = Field(default=2, description="Maximum directory depth to explore")


class GitStatusInput(BaseModel):
    """Input for getting git status."""
    pass


class GitCommitInput(BaseModel):
    """Input for committing changes."""
    message: str = Field(description="Commit message")
    add_all: bool = Field(default=True, description="Add all changes before commit")


class GitBranchInput(BaseModel):
    """Input for git branch operations."""
    action: str = Field(description="Action: 'list', 'create', 'switch', 'delete'")
    branch_name: str = Field(default="", description="Branch name (for create/switch/delete)")


class FindInFilesInput(BaseModel):
    """Input for finding text in files."""
    pattern: str = Field(description="Text pattern to search for")
    file_pattern: str = Field(default="*", description="File pattern to search in")
    case_sensitive: bool = Field(default=False, description="Case sensitive search")


class ReplaceInFilesInput(BaseModel):
    """Input for replacing text in files."""
    search_pattern: str = Field(description="Text pattern to search for")
    replacement: str = Field(description="Replacement text")
    file_pattern: str = Field(default="*", description="File pattern to search in")
    case_sensitive: bool = Field(default=False, description="Case sensitive search")


class AnalyzeCodeInput(BaseModel):
    """Input for analyzing code structure."""
    file_path: str = Field(description="Path to the file to analyze")
    analysis_type: str = Field(default="structure", description="Type: 'structure', 'complexity', 'dependencies'")


class RunTestsInput(BaseModel):
    """Input for running tests."""
    test_path: str = Field(default="", description="Specific test file or directory")
    test_framework: str = Field(default="auto", description="Test framework: 'auto', 'pytest', 'unittest', 'jest'")


class LintCodeInput(BaseModel):
    """Input for linting code."""
    file_path: str = Field(description="Path to the file to lint")
    fix_issues: bool = Field(default=False, description="Attempt to auto-fix issues")


class FormatCodeInput(BaseModel):
    """Input for formatting code."""
    file_path: str = Field(description="Path to the file to format")
    formatter: str = Field(default="auto", description="Formatter: 'auto', 'black', 'prettier', 'autopep8'")


class CreateProjectStructureInput(BaseModel):
    """Input for creating project structure."""
    project_type: str = Field(description="Type: 'python', 'javascript', 'react', 'flask', 'django'")
    project_name: str = Field(description="Name of the project")
    include_tests: bool = Field(default=True, description="Include test structure")


class InstallPackageInput(BaseModel):
    """Input for installing packages."""
    package_name: str = Field(description="Package name to install")
    package_manager: str = Field(default="auto", description="Manager: 'auto', 'pip', 'npm', 'yarn'")


class GetSymbolDefinitionInput(BaseModel):
    """Input for finding symbol definitions."""
    file_path: str = Field(description="Path to the file containing the symbol")
    symbol_name: str = Field(description="Name of the symbol (function, class, variable)")
    line_number: int = Field(default=0, description="Line number where symbol is used (optional)")


class GetSymbolReferencesInput(BaseModel):
    """Input for finding symbol references."""
    symbol_name: str = Field(description="Name of the symbol to find references for")
    file_path: str = Field(default="", description="File containing the symbol definition (optional)")


class RefactorRenameInput(BaseModel):
    """Input for renaming symbols."""
    file_path: str = Field(description="Path to the file containing the symbol")
    old_name: str = Field(description="Current name of the symbol")
    new_name: str = Field(description="New name for the symbol")
    symbol_type: str = Field(default="auto", description="Type: 'auto', 'variable', 'function', 'class'")


class ExtractMethodInput(BaseModel):
    """Input for extracting method."""
    file_path: str = Field(description="Path to the file")
    start_line: int = Field(description="Start line of code to extract")
    end_line: int = Field(description="End line of code to extract")
    method_name: str = Field(description="Name for the new method")


class GenerateDocstringInput(BaseModel):
    """Input for generating documentation."""
    file_path: str = Field(description="Path to the file")
    function_name: str = Field(description="Function/class name to document")
    doc_style: str = Field(default="google", description="Style: 'google', 'numpy', 'sphinx'")


class CreateFileTemplateInput(BaseModel):
    """Input for creating files from templates."""
    file_path: str = Field(description="Path for the new file")
    template_type: str = Field(description="Template: 'class', 'function', 'test', 'module', 'script'")
    name: str = Field(description="Name for the class/function/module")
    language: str = Field(default="python", description="Programming language")


class DebugAnalysisInput(BaseModel):
    """Input for debugging analysis."""
    file_path: str = Field(description="Path to the file with issues")
    error_message: str = Field(default="", description="Error message (optional)")
    line_number: int = Field(default=0, description="Line number with issue (optional)")


class OptimizeCodeInput(BaseModel):
    """Input for code optimization."""
    file_path: str = Field(description="Path to the file to optimize")
    optimization_type: str = Field(default="performance", description="Type: 'performance', 'memory', 'readability'")


class SecurityAuditInput(BaseModel):
    """Input for security audit."""
    file_path: str = Field(description="Path to the file to audit")
    audit_type: str = Field(default="all", description="Type: 'all', 'sql_injection', 'xss', 'secrets'")


class GenerateTestsInput(BaseModel):
    """Input for generating tests."""
    file_path: str = Field(description="Path to the file to generate tests for")
    test_framework: str = Field(default="pytest", description="Test framework")
    coverage_target: int = Field(default=80, description="Target coverage percentage")


class BiscuitTool(BaseTool):
    """Base class for Biscuit tools."""

    base: typing.Any = None  # Will be set when creating tools

    def __init__(self, **kwargs):
        super().__init__(**kwargs)


class FileReadTool(BiscuitTool):
    """Tool for reading file contents."""
    
    name: str = "read_file"
    description: str = "Read the contents of a file"
    args_schema: type[BaseModel] = FileReadInput

    def _run(self, file_path: str) -> str:
        """Read file contents."""
        try:
            # Convert to absolute path if relative
            if not os.path.isabs(file_path):
                if hasattr(self.base, 'active_directory') and self.base.active_directory:
                    file_path = os.path.join(self.base.active_directory, file_path)
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return f"File contents of {file_path}:\n{content}"
        except Exception as e:
            return f"Error reading file {file_path}: {str(e)}"


class FileWriteTool(BiscuitTool):
    """Tool for writing to files."""
    
    name: str = "write_file"
    description: str = "Write content to a file (creates or overwrites)"
    args_schema: type[BaseModel] = FileWriteInput

    def _run(self, file_path: str, content: str) -> str:
        """Write content to file."""
        try:
            # Convert to absolute path if relative
            if not os.path.isabs(file_path):
                if hasattr(self.base, 'active_directory') and self.base.active_directory:
                    file_path = os.path.join(self.base.active_directory, file_path)
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # Refresh the file explorer if the file is in the workspace
            if hasattr(self.base, 'explorer'):
                self.base.explorer.directory.refresh_root()
            
            return f"Successfully wrote to {file_path}"
        except Exception as e:
            return f"Error writing to file {file_path}: {str(e)}"


class FileCreateTool(BiscuitTool):
    """Tool for creating new files."""
    
    name: str = "create_file"
    description: str = "Create a new file with initial content"
    args_schema: type[BaseModel] = FileCreateInput

    def _run(self, file_path: str, content: str) -> str:
        """Create a new file."""
        try:
            # Convert to absolute path if relative
            if not os.path.isabs(file_path):
                if hasattr(self.base, 'active_directory') and self.base.active_directory:
                    file_path = os.path.join(self.base.active_directory, file_path)
            
            # Check if file already exists
            if os.path.exists(file_path):
                return f"File {file_path} already exists. Use write_file to modify it."
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # Refresh the file explorer
            if hasattr(self.base, 'explorer'):
                self.base.explorer.directory.refresh_root()
            
            return f"Successfully created {file_path}"
        except Exception as e:
            return f"Error creating file {file_path}: {str(e)}"


class DirectoryListTool(BiscuitTool):
    """Enhanced tool for listing directory contents with optional details."""
    
    name: str = "list_directory"
    description: str = "List the contents of a directory with optional file details"
    args_schema: type[BaseModel] = DirectoryListInput

    def _run(self, directory_path: str, show_hidden: bool = False, show_details: bool = False) -> str:
        """List directory contents with enhanced information."""
        try:
            # Convert to absolute path if relative
            if not os.path.isabs(directory_path):
                if hasattr(self.base, 'active_directory') and self.base.active_directory:
                    directory_path = os.path.join(self.base.active_directory, directory_path)
            
            if not os.path.exists(directory_path):
                return f"Directory {directory_path} does not exist"
            
            if not os.path.isdir(directory_path):
                return f"{directory_path} is not a directory"
            
            items = []
            total_files = 0
            total_dirs = 0
            
            for item in sorted(os.listdir(directory_path)):
                if not show_hidden and item.startswith('.'):
                    continue
                    
                item_path = os.path.join(directory_path, item)
                
                if os.path.isdir(item_path):
                    total_dirs += 1
                    if show_details:
                        try:
                            mod_time = os.path.getmtime(item_path)
                            from datetime import datetime
                            mod_str = datetime.fromtimestamp(mod_time).strftime("%Y-%m-%d %H:%M")
                            items.append(f"📁 {item}/ (modified: {mod_str})")
                        except:
                            items.append(f"📁 {item}/")
                    else:
                        items.append(f"📁 {item}/")
                else:
                    total_files += 1
                    if show_details:
                        try:
                            size = os.path.getsize(item_path)
                            mod_time = os.path.getmtime(item_path)
                            from datetime import datetime
                            mod_str = datetime.fromtimestamp(mod_time).strftime("%Y-%m-%d %H:%M")
                            size_str = self._format_size(size)
                            items.append(f"📄 {item} ({size_str}, modified: {mod_str})")
                        except:
                            items.append(f"📄 {item}")
                    else:
                        items.append(f"📄 {item}")
            
            summary = f"Contents of {directory_path} ({total_dirs} directories, {total_files} files):"
            return summary + "\n" + "\n".join(items)
            
        except Exception as e:
            return f"Error listing directory {directory_path}: {str(e)}"
    
    def _format_size(self, size_bytes: int) -> str:
        """Format file size in human readable format."""
        if size_bytes == 0:
            return "0 B"
        
        size_names = ["B", "KB", "MB", "GB"]
        size = float(size_bytes)
        i = 0
        while size >= 1024 and i < len(size_names) - 1:
            size /= 1024.0
            i += 1
        
        return f"{size:.1f} {size_names[i]}"


class SearchCodeTool(BiscuitTool):
    """Enhanced tool for searching code patterns in the workspace with regex support."""
    
    name: str = "search_code"
    description: str = "Search for code/text patterns in the workspace with advanced filtering and regex support"
    args_schema: type[BaseModel] = SearchCodeInput

    def _run(self, query: str, file_extension: str = "", include_pattern: str = "", 
             exclude_pattern: str = "", case_sensitive: bool = False, max_results: int = 50) -> str:
        """Search for code patterns with enhanced filtering."""
        try:
            results = []
            search_dir = getattr(self.base, 'active_directory', '.')
            
            if not search_dir or not os.path.exists(search_dir):
                return "No active workspace directory"
            
            # Common exclude patterns
            default_excludes = {'.git', '__pycache__', 'node_modules', '.pytest_cache', 
                              'venv', 'env', '.venv', 'dist', 'build', '.next', '.nuxt'}
            
            flags = 0 if case_sensitive else re.IGNORECASE
            
            for root, dirs, files in os.walk(search_dir):
                # Filter directories
                dirs[:] = [d for d in dirs if not d.startswith('.') and d not in default_excludes]
                
                for file in files:
                    if file.startswith('.'):
                        continue
                    
                    # Apply file extension filter
                    if file_extension and not file.endswith(file_extension):
                        continue
                    
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, search_dir)
                    
                    # Apply include/exclude patterns
                    if include_pattern and not re.search(include_pattern, rel_path, flags):
                        continue
                    if exclude_pattern and re.search(exclude_pattern, rel_path, flags):
                        continue
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            lines = f.readlines()
                            for line_num, line in enumerate(lines, 1):
                                try:
                                    # Try regex search first, fall back to simple string search
                                    if re.search(query, line, flags):
                                        results.append(f"{rel_path}:{line_num}: {line.strip()}")
                                        if len(results) >= max_results:
                                            break
                                except re.error:
                                    # Fall back to simple string search if regex fails
                                    if (query.lower() in line.lower()) if not case_sensitive else (query in line):
                                        results.append(f"{rel_path}:{line_num}: {line.strip()}")
                                        if len(results) >= max_results:
                                            break
                        if len(results) >= max_results:
                            break
                    except Exception:
                        continue
                
                if len(results) >= max_results:
                    break
            
            if not results:
                return f"No matches found for '{query}'"
            
            # Enhanced output with summary
            summary = f"Found {len(results)} matches for '{query}'"
            if file_extension:
                summary += f" in {file_extension} files"
            if include_pattern:
                summary += f" (included: {include_pattern})"
            if exclude_pattern:
                summary += f" (excluded: {exclude_pattern})"
            
            display_results = results[:20]  # Show first 20
            result_text = summary + ":\n" + "\n".join(display_results)
            
            if len(results) > 20:
                result_text += f"\n... and {len(results) - 20} more matches"
            
            return result_text
            
        except Exception as e:
            return f"Error searching: {str(e)}"


class OpenFileTool(BiscuitTool):
    """Tool for opening files in the editor."""
    
    name: str = "open_file"
    description: str = "Open a file in the Biscuit editor"
    args_schema: type[BaseModel] = OpenFileInput

    def _run(self, file_path: str, line_number: int = 1) -> str:
        """Open file in editor."""
        try:
            # Convert to absolute path if relative
            if not os.path.isabs(file_path):
                if hasattr(self.base, 'active_directory') and self.base.active_directory:
                    file_path = os.path.join(self.base.active_directory, file_path)
            
            if not os.path.exists(file_path):
                return f"File {file_path} does not exist"
            
            # Open file in editor
            if hasattr(self.base, 'editorsmanager'):
                editor = self.base.editorsmanager.open_editor(file_path)
                if editor and editor.content and editor.content.text and line_number > 1:
                    # Jump to specific line if specified
                    editor.content.text.mark_set("insert", f"{line_number}.0")
                    editor.content.text.see("insert")
                return f"Opened {file_path} in editor" + (f" at line {line_number}" if line_number > 1 else "")
            else:
                return f"Editor manager not available"
        except Exception as e:
            return f"Error opening file {file_path}: {str(e)}"


class ExecuteCommandTool(BiscuitTool):
    """Tool for executing terminal commands."""
    
    name: str = "execute_command"
    description: str = "Execute a command in the terminal"
    args_schema: type[BaseModel] = ExecuteCommandInput

    def _run(self, command: str, working_directory: str = "") -> str:
        """Execute terminal command."""
        try:
            # Use Biscuit's terminal manager if available
            if hasattr(self.base, 'terminalmanager'):
                terminal = self.base.terminalmanager.active_terminal
                if terminal:
                    if working_directory:
                        # Change directory first
                        terminal.run_command(f"cd {working_directory}")
                    terminal.run_command(command)
                    return f"Executed command: {command}"
                else:
                    return "No active terminal available"
            else:
                return "Terminal manager not available"
        except Exception as e:
            return f"Error executing command: {str(e)}"


class GetActiveEditorTool(BiscuitTool):
    """Tool for getting information about the active editor."""
    
    name: str = "get_active_editor"
    description: str = "Get information about the currently active editor"
    args_schema: type[BaseModel] = GetActiveEditorInput

    def _run(self) -> str:
        """Get active editor information."""
        try:
            if hasattr(self.base, 'editorsmanager'):
                editor = self.base.editorsmanager.active_editor
                if editor:
                    info = {
                        "file_path": getattr(editor, 'path', 'Unknown'),
                        "file_name": getattr(editor, 'filename', 'Unknown'),
                        "language": getattr(editor, 'language', 'Unknown'),
                        "is_modified": getattr(editor, 'modified', False),
                        "line_count": 0,
                        "current_line": 1,
                        "current_column": 1
                    }
                    
                    if hasattr(editor, 'content') and editor.content and editor.content.text:
                        text_widget = editor.content.text
                        info["line_count"] = int(text_widget.index('end-1c').split('.')[0])
                        cursor_pos = text_widget.index('insert')
                        info["current_line"] = int(cursor_pos.split('.')[0])
                        info["current_column"] = int(cursor_pos.split('.')[1])
                    
                    return f"Active editor info:\n" + "\n".join(f"{k}: {v}" for k, v in info.items())
                else:
                    return "No active editor"
            else:
                return "Editor manager not available"
        except Exception as e:
            return f"Error getting active editor info: {str(e)}"


class GetWorkspaceInfoTool(BiscuitTool):
    """Tool for getting workspace information."""
    
    name: str = "get_workspace_info"
    description: str = "Get information about the current workspace"
    args_schema: type[BaseModel] = GetWorkspaceInfoInput

    def _run(self) -> str:
        """Get workspace information."""
        try:
            info = {}
            
            if hasattr(self.base, 'active_directory'):
                info["workspace_path"] = self.base.active_directory or "No workspace open"
            
            if hasattr(self.base, 'editorsmanager'):
                open_editors = len(self.base.editorsmanager.active_editors)
                info["open_editors_count"] = open_editors
            
            if hasattr(self.base, 'terminalmanager'):
                terminals = len(self.base.terminalmanager.active_terminals)
                info["terminal_count"] = terminals
            
            # Git information
            if hasattr(self.base, 'source_control'):
                try:
                    git_info = self.base.git
                    if git_info and hasattr(git_info, 'repo'):
                        info["git_branch"] = git_info.repo.active_branch.name
                        info["git_status"] = "Repository available"
                    else:
                        info["git_status"] = "No git repository"
                except:
                    info["git_status"] = "No git repository"
            
            return f"Workspace information:\n" + "\n".join(f"{k}: {v}" for k, v in info.items())
        except Exception as e:
            return f"Error getting workspace info: {str(e)}"


class FileReadRangeTool(BiscuitTool):
    """Tool for reading specific lines from a file."""
    
    name: str = "read_file_range"
    description: str = "Read specific lines from a file"
    args_schema: type[BaseModel] = FileReadRangeInput

    def _run(self, file_path: str, start_line: int, end_line: int) -> str:
        """Read specific lines from file."""
        try:
            if not os.path.isabs(file_path):
                if hasattr(self.base, 'active_directory') and self.base.active_directory:
                    file_path = os.path.join(self.base.active_directory, file_path)
            
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Adjust for 1-indexed line numbers
            start_idx = max(0, start_line - 1)
            end_idx = min(len(lines), end_line)
            
            selected_lines = lines[start_idx:end_idx]
            content = ''.join(selected_lines)
            
            return f"Lines {start_line}-{end_line} from {file_path}:\n{content}"
        except Exception as e:
            return f"Error reading file range {file_path}: {str(e)}"


class GetDirectoryTreeTool(BiscuitTool):
    """Tool for getting directory tree structure."""
    
    name: str = "get_directory_tree"
    description: str = "Get directory tree structure with optional depth limit"
    args_schema: type[BaseModel] = GetDirectoryTreeInput

    def _run(self, directory_path: str, max_depth: int = 3) -> str:
        """Get directory tree structure."""
        try:
            if not os.path.isabs(directory_path):
                if hasattr(self.base, 'active_directory') and self.base.active_directory:
                    directory_path = os.path.join(self.base.active_directory, directory_path)
            
            def build_tree(path, current_depth=0, prefix=""):
                if current_depth > max_depth:
                    return ""
                
                items = []
                try:
                    entries = sorted(os.listdir(path))
                    for i, entry in enumerate(entries):
                        if entry.startswith('.'):
                            continue
                            
                        entry_path = os.path.join(path, entry)
                        is_last = i == len(entries) - 1
                        
                        if os.path.isdir(entry_path):
                            items.append(f"{prefix}{'└── ' if is_last else '├── '}{entry}/")
                            if current_depth < max_depth:
                                sub_prefix = prefix + ("    " if is_last else "│   ")
                                items.append(build_tree(entry_path, current_depth + 1, sub_prefix))
                        else:
                            items.append(f"{prefix}{'└── ' if is_last else '├── '}{entry}")
                except PermissionError:
                    items.append(f"{prefix}[Permission Denied]")
                
                return "\n".join(filter(None, items))
            
            tree = build_tree(directory_path)
            return f"Directory tree for {directory_path}:\n{tree}"
        except Exception as e:
            return f"Error getting directory tree: {str(e)}"


class FindInFilesTool(BiscuitTool):
    """Tool for finding text patterns in files."""
    
    name: str = "find_in_files"
    description: str = "Search for text patterns across multiple files"
    args_schema: type[BaseModel] = FindInFilesInput

    def _run(self, pattern: str, file_pattern: str = "*", case_sensitive: bool = False) -> str:
        """Find text patterns in files."""
        try:
            import glob
            
            base_dir = getattr(self.base, 'active_directory', os.getcwd())
            search_pattern = os.path.join(base_dir, "**", file_pattern)
            
            matches = []
            flags = 0 if case_sensitive else re.IGNORECASE
            
            for file_path in glob.glob(search_pattern, recursive=True):
                if os.path.isfile(file_path):
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            for line_num, line in enumerate(f, 1):
                                if re.search(pattern, line, flags):
                                    rel_path = os.path.relpath(file_path, base_dir)
                                    matches.append(f"{rel_path}:{line_num}: {line.strip()}")
                    except Exception:
                        continue
            
            if matches:
                result = f"Found {len(matches)} matches for '{pattern}':\n"
                result += "\n".join(matches[:50])  # Limit to first 50 matches
                if len(matches) > 50:
                    result += f"\n... and {len(matches) - 50} more matches"
                return result
            else:
                return f"No matches found for '{pattern}'"
        except Exception as e:
            return f"Error searching files: {str(e)}"


class AnalyzeCodeTool(BiscuitTool):
    """Tool for analyzing code structure and complexity."""
    
    name: str = "analyze_code"
    description: str = "Analyze code structure, complexity, or dependencies"
    args_schema: type[BaseModel] = AnalyzeCodeInput

    def _run(self, file_path: str, analysis_type: str = "structure") -> str:
        """Analyze code file."""
        try:
            if not os.path.isabs(file_path):
                if hasattr(self.base, 'active_directory') and self.base.active_directory:
                    file_path = os.path.join(self.base.active_directory, file_path)
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if file_path.endswith('.py'):
                return self._analyze_python_code(content, analysis_type)
            elif file_path.endswith(('.js', '.ts', '.jsx', '.tsx')):
                return self._analyze_javascript_code(content, analysis_type)
            else:
                return self._analyze_generic_code(content, analysis_type)
                
        except Exception as e:
            return f"Error analyzing code: {str(e)}"
    
    def _analyze_python_code(self, content: str, analysis_type: str) -> str:
        """Analyze Python code."""
        try:
            tree = ast.parse(content)
            
            if analysis_type == "structure":
                classes = [node.name for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]
                functions = [node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
                imports = []
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        imports.extend([alias.name for alias in node.names])
                    elif isinstance(node, ast.ImportFrom):
                        module = node.module or ""
                        imports.extend([f"{module}.{alias.name}" for alias in node.names])
                
                result = f"Python Code Structure:\n"
                result += f"Classes: {', '.join(classes) if classes else 'None'}\n"
                result += f"Functions: {', '.join(functions) if functions else 'None'}\n"
                result += f"Imports: {', '.join(imports[:10]) if imports else 'None'}"
                if len(imports) > 10:
                    result += f" (and {len(imports) - 10} more)"
                return result
                
            elif analysis_type == "complexity":
                # Simple complexity analysis
                lines = content.split('\n')
                non_empty_lines = [line for line in lines if line.strip()]
                cyclomatic_complexity = content.count('if ') + content.count('for ') + content.count('while ') + content.count('except ') + 1
                
                return f"Code Complexity:\nLines: {len(lines)}\nNon-empty lines: {len(non_empty_lines)}\nEstimated cyclomatic complexity: {cyclomatic_complexity}"
            else:
                return f"Unsupported analysis type: {analysis_type}"
                
        except Exception as e:
            return f"Error analyzing Python code: {str(e)}"
    
    def _analyze_javascript_code(self, content: str, analysis_type: str) -> str:
        """Analyze JavaScript/TypeScript code."""
        if analysis_type == "structure":
            # Simple regex-based analysis for JS/TS
            functions = re.findall(r'function\s+(\w+)', content)
            classes = re.findall(r'class\s+(\w+)', content)
            imports = re.findall(r'import.*from\s+[\'"]([^\'"]+)[\'"]', content)
            
            result = f"JavaScript/TypeScript Code Structure:\n"
            result += f"Functions: {', '.join(functions) if functions else 'None'}\n"
            result += f"Classes: {', '.join(classes) if classes else 'None'}\n"
            result += f"Imports: {', '.join(imports[:10]) if imports else 'None'}"
            return result
        
        return "JavaScript/TypeScript analysis not fully implemented yet"
    
    def _analyze_generic_code(self, content: str, analysis_type: str) -> str:
        """Generic code analysis."""
        lines = content.split('\n')
        non_empty_lines = [line for line in lines if line.strip()]
        comments = [line for line in lines if line.strip().startswith(('#', '//', '/*', '*'))]
        
        return f"Generic Code Analysis:\nTotal lines: {len(lines)}\nNon-empty lines: {len(non_empty_lines)}\nComment lines: {len(comments)}"


class GitStatusTool(BiscuitTool):
    """Tool for getting git status."""
    
    name: str = "git_status"
    description: str = "Get the current git status of the repository"
    args_schema: type[BaseModel] = GitStatusInput

    def _run(self) -> str:
        """Get git status."""
        try:
            cwd = getattr(self.base, 'active_directory', os.getcwd())
            result = subprocess.run(['git', 'status', '--porcelain'], 
                                  capture_output=True, text=True, cwd=cwd)
            
            if result.returncode == 0:
                if result.stdout.strip():
                    return f"Git status:\n{result.stdout}"
                else:
                    return "Git status: Working tree clean"
            else:
                return f"Git error: {result.stderr}"
        except Exception as e:
            return f"Error getting git status: {str(e)}"


class GitCommitTool(BiscuitTool):
    """Tool for committing changes."""
    
    name: str = "git_commit"
    description: str = "Commit changes to git repository"
    args_schema: type[BaseModel] = GitCommitInput

    def _run(self, message: str, add_all: bool = True) -> str:
        """Commit changes to git."""
        try:
            cwd = getattr(self.base, 'active_directory', os.getcwd())
            
            if add_all:
                add_result = subprocess.run(['git', 'add', '.'], 
                                          capture_output=True, text=True, cwd=cwd)
                if add_result.returncode != 0:
                    return f"Git add error: {add_result.stderr}"
            
            commit_result = subprocess.run(['git', 'commit', '-m', message], 
                                         capture_output=True, text=True, cwd=cwd)
            
            if commit_result.returncode == 0:
                return f"Git commit successful:\n{commit_result.stdout}"
            else:
                return f"Git commit error: {commit_result.stderr}"
        except Exception as e:
            return f"Error committing to git: {str(e)}"


class RunTestsTool(BiscuitTool):
    """Tool for running tests."""
    
    name: str = "run_tests"
    description: str = "Run tests using various testing frameworks"
    args_schema: type[BaseModel] = RunTestsInput

    def _run(self, test_path: str = "", test_framework: str = "auto") -> str:
        """Run tests."""
        try:
            cwd = getattr(self.base, 'active_directory', os.getcwd())
            
            if test_framework == "auto":
                # Auto-detect testing framework
                if os.path.exists(os.path.join(cwd, 'pytest.ini')) or os.path.exists(os.path.join(cwd, 'pyproject.toml')):
                    test_framework = "pytest"
                elif os.path.exists(os.path.join(cwd, 'package.json')):
                    test_framework = "jest"
                else:
                    test_framework = "pytest"
            
            if test_framework == "pytest":
                cmd = ['python', '-m', 'pytest', '-v']
                if test_path:
                    cmd.append(test_path)
            elif test_framework == "unittest":
                cmd = ['python', '-m', 'unittest', 'discover']
                if test_path:
                    cmd.extend(['-s', test_path])
            elif test_framework == "jest":
                cmd = ['npm', 'test']
            else:
                return f"Unsupported test framework: {test_framework}"
            
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd, timeout=60)
            
            output = f"Test execution completed with exit code {result.returncode}\n"
            output += f"STDOUT:\n{result.stdout}\n"
            if result.stderr:
                output += f"STDERR:\n{result.stderr}"
            
            return output
        except subprocess.TimeoutExpired:
            return "Test execution timed out after 60 seconds"
        except Exception as e:
            return f"Error running tests: {str(e)}"


class GetSymbolDefinitionTool(BiscuitTool):
    name: str = "get_symbol_definition"
    description: str = "Find the definition of a symbol (function, class, variable)"
    args_schema: type[BaseModel] = GetSymbolDefinitionInput
    
    def _run(self, file_path: str, symbol_name: str, line_number: int = 0) -> str:
        return f"Symbol definition search for '{symbol_name}' - Feature coming soon"


class GetSymbolReferencesTool(BiscuitTool):
    name: str = "get_symbol_references"
    description: str = "Find all references to a symbol"
    args_schema: type[BaseModel] = GetSymbolReferencesInput
    
    def _run(self, symbol_name: str, file_path: str = "") -> str:
        return f"Symbol reference search for '{symbol_name}' - Feature coming soon"


class OpenNewEditorTool(BiscuitTool):
    name: str = "open_new_editor"
    description: str = "Open a new empty editor tab"
    args_schema: type[BaseModel] = OpenNewEditorInput
    
    def _run(self, file_name: str = "untitled") -> str:
        try:
            if hasattr(self.base, 'editorsmanager'):
                self.base.open_editor(file_name, exists=False)
                return f"New editor '{file_name}' created successfully"
            return "Editor manager not available"
        except Exception as e:
            return f"Error creating new editor: {str(e)}"


class ReplaceInFilesTool(BiscuitTool):
    name: str = "replace_in_files"
    description: str = "Replace text patterns in files"
    args_schema: type[BaseModel] = ReplaceInFilesInput
    
    def _run(self, search_pattern: str, replacement: str, file_pattern: str = "*", case_sensitive: bool = False) -> str:
        return f"Replace '{search_pattern}' with '{replacement}' - Feature coming soon"


class RefactorRenameTool(BiscuitTool):
    name: str = "refactor_rename"
    description: str = "Rename symbols across the codebase"
    args_schema: type[BaseModel] = RefactorRenameInput
    
    def _run(self, file_path: str, old_name: str, new_name: str, symbol_type: str = "auto") -> str:
        return f"Rename '{old_name}' to '{new_name}' - Feature coming soon"


class ExtractMethodTool(BiscuitTool):
    name: str = "extract_method"
    description: str = "Extract code into a new method"
    args_schema: type[BaseModel] = ExtractMethodInput
    
    def _run(self, file_path: str, start_line: int, end_line: int, method_name: str) -> str:
        return f"Extract method '{method_name}' from lines {start_line}-{end_line} - Feature coming soon"


class FormatCodeTool(BiscuitTool):
    name: str = "format_code"
    description: str = "Format code using various formatters"
    args_schema: type[BaseModel] = FormatCodeInput
    
    def _run(self, file_path: str, formatter: str = "auto") -> str:
        try:
            if not os.path.isabs(file_path):
                if hasattr(self.base, 'active_directory') and self.base.active_directory:
                    file_path = os.path.join(self.base.active_directory, file_path)
            
            cwd = getattr(self.base, 'active_directory', os.getcwd())
            
            if formatter == "auto":
                if file_path.endswith('.py'):
                    formatter = "black"
                elif file_path.endswith(('.js', '.ts', '.jsx', '.tsx')):
                    formatter = "prettier"
                else:
                    return f"No auto-formatter available for {file_path}"
            
            if formatter == "black":
                result = subprocess.run(['python', '-m', 'black', file_path], 
                                      capture_output=True, text=True, cwd=cwd)
            elif formatter == "prettier":
                result = subprocess.run(['npx', 'prettier', '--write', file_path], 
                                      capture_output=True, text=True, cwd=cwd)
            else:
                return f"Unsupported formatter: {formatter}"
            
            if result.returncode == 0:
                return f"Successfully formatted {file_path} with {formatter}"
            else:
                return f"Formatting error: {result.stderr}"
        except Exception as e:
            return f"Error formatting code: {str(e)}"


class LintCodeTool(BiscuitTool):
    name: str = "lint_code"
    description: str = "Lint code for style and potential issues"
    args_schema: type[BaseModel] = LintCodeInput
    
    def _run(self, file_path: str, fix_issues: bool = False) -> str:
        return f"Lint code in '{file_path}' - Feature coming soon"


class GenerateDocstringTool(BiscuitTool):
    name: str = "generate_docstring"
    description: str = "Generate documentation for functions and classes"
    args_schema: type[BaseModel] = GenerateDocstringInput
    
    def _run(self, file_path: str, function_name: str, doc_style: str = "google") -> str:
        return f"Generate {doc_style} docstring for '{function_name}' - Feature coming soon"


class OptimizeCodeTool(BiscuitTool):
    name: str = "optimize_code"
    description: str = "Optimize code for performance or readability"
    args_schema: type[BaseModel] = OptimizeCodeInput
    
    def _run(self, file_path: str, optimization_type: str = "performance") -> str:
        return f"Optimize code for {optimization_type} - Feature coming soon"


class SecurityAuditTool(BiscuitTool):
    name: str = "security_audit"
    description: str = "Audit code for security issues"
    args_schema: type[BaseModel] = SecurityAuditInput
    
    def _run(self, file_path: str, audit_type: str = "all") -> str:
        return f"Security audit for {audit_type} - Feature coming soon"


class GenerateTestsTool(BiscuitTool):
    name: str = "generate_tests"
    description: str = "Generate unit tests for code"
    args_schema: type[BaseModel] = GenerateTestsInput
    
    def _run(self, file_path: str, test_framework: str = "pytest", coverage_target: int = 80) -> str:
        return f"Generate {test_framework} tests with {coverage_target}% coverage - Feature coming soon"


class GitBranchTool(BiscuitTool):
    name: str = "git_branch"
    description: str = "Git branch operations (list, create, switch, delete)"
    args_schema: type[BaseModel] = GitBranchInput
    
    def _run(self, action: str, branch_name: str = "") -> str:
        try:
            cwd = getattr(self.base, 'active_directory', os.getcwd())
            
            if action == "list":
                result = subprocess.run(['git', 'branch'], capture_output=True, text=True, cwd=cwd)
            elif action == "create" and branch_name:
                result = subprocess.run(['git', 'checkout', '-b', branch_name], capture_output=True, text=True, cwd=cwd)
            elif action == "switch" and branch_name:
                result = subprocess.run(['git', 'checkout', branch_name], capture_output=True, text=True, cwd=cwd)
            elif action == "delete" and branch_name:
                result = subprocess.run(['git', 'branch', '-d', branch_name], capture_output=True, text=True, cwd=cwd)
            else:
                return f"Invalid git branch action: {action}"
            
            if result.returncode == 0:
                return f"Git branch {action} successful:\n{result.stdout}"
            else:
                return f"Git branch error: {result.stderr}"
        except Exception as e:
            return f"Error with git branch operation: {str(e)}"


class CreateProjectStructureTool(BiscuitTool):
    name: str = "create_project_structure"
    description: str = "Create project structure for various project types"
    args_schema: type[BaseModel] = CreateProjectStructureInput
    
    def _run(self, project_type: str, project_name: str, include_tests: bool = True) -> str:
        return f"Create {project_type} project '{project_name}' - Feature coming soon"


class InstallPackageTool(BiscuitTool):
    name: str = "install_package"
    description: str = "Install packages using various package managers"
    args_schema: type[BaseModel] = InstallPackageInput
    
    def _run(self, package_name: str, package_manager: str = "auto") -> str:
        try:
            cwd = getattr(self.base, 'active_directory', os.getcwd())
            
            if package_manager == "auto":
                if os.path.exists(os.path.join(cwd, 'package.json')):
                    package_manager = "npm"
                elif os.path.exists(os.path.join(cwd, 'requirements.txt')) or os.path.exists(os.path.join(cwd, 'pyproject.toml')):
                    package_manager = "pip"
                else:
                    package_manager = "pip"
            
            if package_manager == "pip":
                result = subprocess.run(['pip', 'install', package_name], capture_output=True, text=True, cwd=cwd)
            elif package_manager == "npm":
                result = subprocess.run(['npm', 'install', package_name], capture_output=True, text=True, cwd=cwd)
            elif package_manager == "yarn":
                result = subprocess.run(['yarn', 'add', package_name], capture_output=True, text=True, cwd=cwd)
            else:
                return f"Unsupported package manager: {package_manager}"
            
            if result.returncode == 0:
                return f"Successfully installed {package_name} with {package_manager}"
            else:
                return f"Installation error: {result.stderr}"
        except Exception as e:
            return f"Error installing package: {str(e)}"


class CreateFileTemplateTool(BiscuitTool):
    name: str = "create_file_template"
    description: str = "Create files from templates"
    args_schema: type[BaseModel] = CreateFileTemplateInput
    
    def _run(self, file_path: str, template_type: str, name: str, language: str = "python") -> str:
        return f"Create {template_type} template '{name}' in {language} - Feature coming soon"


class AnalyzeProjectTool(BiscuitTool):
    name: str = "analyze_project"
    description: str = "Comprehensive analysis of project structure, file types, and organization"
    args_schema: type[BaseModel] = ProjectExplorationInput
    
    def _run(self, include_file_analysis: bool = True, include_structure: bool = True, max_depth: int = 2) -> str:
        """Comprehensive project analysis with enhanced features."""
        try:
            cwd = getattr(self.base, 'active_directory', os.getcwd())
            
            analysis = []
            analysis.append(f"**Project Analysis for: {os.path.basename(cwd)}**")
            analysis.append(f"**Location:** {cwd}")
            
            # Check for common project files and determine project type
            project_files = []
            project_type_indicators = {
                'python': ['setup.py', 'pyproject.toml', 'requirements.txt', 'Pipfile'],
                'javascript': ['package.json', 'yarn.lock', 'package-lock.json'],
                'typescript': ['tsconfig.json', 'package.json'],
                'rust': ['Cargo.toml'],
                'go': ['go.mod', 'go.sum'],
                'java': ['pom.xml', 'build.gradle'],
                'c++': ['CMakeLists.txt', 'Makefile'],
                'docker': ['Dockerfile', 'docker-compose.yml']
            }
            
            detected_types = []
            for file in ['README.md', 'LICENSE', '.gitignore', 'setup.py', 'pyproject.toml', 
                        'requirements.txt', 'package.json', 'tsconfig.json', 'Cargo.toml', 
                        'go.mod', 'Dockerfile', 'docker-compose.yml']:
                if os.path.exists(os.path.join(cwd, file)):
                    project_files.append(file)
                    
                    # Detect project type
                    for proj_type, indicators in project_type_indicators.items():
                        if file in indicators and proj_type not in detected_types:
                            detected_types.append(proj_type)
            
            analysis.append(f"**Project files found:** {', '.join(project_files) if project_files else 'None'}")
            analysis.append(f"**Detected project types:** {', '.join(detected_types) if detected_types else 'Unknown'}")
            
            if include_file_analysis:
                # Enhanced file type analysis
                file_counts = {}
                total_files = 0
                important_dirs = []
                
                # Common important directories
                key_dirs = ['src', 'lib', 'app', 'core', 'modules', 'components', 'tests', 'docs', 'scripts', 'utils']
                
                for root, dirs, files in os.walk(cwd):
                    # Skip hidden directories and common ignore patterns
                    dirs[:] = [d for d in dirs if not d.startswith('.') and 
                              d not in ['node_modules', '__pycache__', 'venv', 'env', 'dist', 'build']]
                    
                    # Check for important directories
                    current_depth = root.replace(cwd, '').count(os.sep)
                    if current_depth <= 1:  # Only check top-level and first-level subdirs
                        dir_name = os.path.basename(root)
                        if dir_name in key_dirs and dir_name not in important_dirs:
                            important_dirs.append(dir_name)
                    
                    if current_depth > max_depth:
                        continue
                    
                    for file in files:
                        if file.startswith('.'):
                            continue
                            
                        total_files += 1
                        ext = os.path.splitext(file)[1].lower()
                        if ext:
                            file_counts[ext] = file_counts.get(ext, 0) + 1
                        else:
                            file_counts['no_extension'] = file_counts.get('no_extension', 0) + 1
                
                # Show file type distribution
                if file_counts:
                    top_types = sorted(file_counts.items(), key=lambda x: x[1], reverse=True)[:10]
                    type_summary = ', '.join([f'{ext}: {count}' for ext, count in top_types])
                    analysis.append(f"**File types ({total_files} total files):** {type_summary}")
                
                if important_dirs:
                    analysis.append(f"**Key directories found:** {', '.join(sorted(important_dirs))}")
            
            # Directory structure overview
            if include_structure:
                try:
                    # Get a compact tree view
                    tree_tool = GetDirectoryTreeTool()
                    tree_tool.base = self.base
                    tree_structure = tree_tool._run(cwd, max_depth)
                    # Extract just the tree part, not the header
                    tree_lines = tree_structure.split('\n')[1:]  # Skip the header line
                    compact_tree = '\n'.join(tree_lines[:20])  # Limit to first 20 lines
                    if len(tree_lines) > 20:
                        compact_tree += f"\n... and {len(tree_lines) - 20} more items"
                    analysis.append(f"**Directory structure:**\n{compact_tree}")
                except Exception:
                    analysis.append("**Directory structure:** Could not generate tree view")
            
            # Try to read README for project description
            readme_path = os.path.join(cwd, 'README.md')
            if os.path.exists(readme_path):
                try:
                    with open(readme_path, 'r', encoding='utf-8') as f:
                        readme_content = f.read()
                        # Extract first paragraph or first 200 chars
                        first_line = readme_content.split('\n')[0]
                        if len(first_line) > 5:  # Skip empty or very short lines
                            analysis.append(f"**Project description:** {first_line[:200]}...")
                except Exception:
                    pass
            
            return "\n\n".join(analysis)
            
        except Exception as e:
            return f"Error analyzing project: {str(e)}"


class DebugAnalysisTool(BiscuitTool):
    name: str = "debug_analysis"
    description: str = "Analyze code for debugging purposes"
    args_schema: type[BaseModel] = DebugAnalysisInput
    
    def _run(self, file_path: str, error_message: str = "", line_number: int = 0) -> str:
        return f"Debug analysis for '{file_path}' - Feature coming soon"


# class FindProjectEntryPointsInput(BaseModel):
#     """Input for finding project entry points."""
#     pass


# class FindProjectEntryPointsTool(BiscuitTool):
#     """Tool for finding likely entry points and key files in a project."""
    
#     name: str = "find_project_entry_points"
#     description: str = "Find likely entry points, main files, and key components in the project"
#     args_schema: type[BaseModel] = FindProjectEntryPointsInput

#     def _run(self) -> str:
#         """Find project entry points and key files."""
#         try:
#             base_dir = getattr(self.base, 'active_directory', os.getcwd())
            
#             results = []
#             results.append("**Project Entry Points and Key Files:**")
            
#             # Look for main entry points
#             entry_points = []
#             main_patterns = [
#                 '__main__.py', 'main.py', 'app.py', 'cli.py', 'run.py', 'server.py',
#                 'manage.py', 'wsgi.py', 'asgi.py', 'index.py'
#             ]
            
#             for root, dirs, files in os.walk(base_dir):
#                 # Skip hidden directories and common ignore patterns
#                 dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['__pycache__', 'node_modules', '.git', 'venv', 'env']]
                
#                 for file in files:
#                     if file in main_patterns:
#                         file_path = os.path.join(root, file)
#                         rel_path = os.path.relpath(file_path, base_dir)
#                         entry_points.append(rel_path)
            
#             if entry_points:
#                 results.append(f"**Entry Points Found:** {', '.join(entry_points)}")
#             else:
#                 results.append("**Entry Points:** None found with common patterns")
            
#             # Look for configuration files
#             config_files = []
#             config_patterns = [
#                 'setup.py', 'pyproject.toml', 'requirements.txt', 'package.json',
#                 'Dockerfile', 'docker-compose.yml', 'Makefile', 'tox.ini', 'pytest.ini'
#             ]
            
#             for pattern in config_patterns:
#                 if os.path.exists(os.path.join(base_dir, pattern)):
#                     config_files.append(pattern)
            
#             if config_files:
#                 results.append(f"**Configuration Files:** {', '.join(config_files)}")
            
#             # Look for important directories
#             important_dirs = []
#             dir_patterns = ['src', 'lib', 'app', 'core', 'modules', 'components', 'tests', 'docs']
            
#             for pattern in dir_patterns:
#                 if os.path.isdir(os.path.join(base_dir, pattern)):
#                     important_dirs.append(pattern)
            
#             if important_dirs:
#                 results.append(f"**Key Directories:** {', '.join(important_dirs)}")
            
#             # Look for key Python modules (if it's a Python project)
#             if any(f.endswith('.py') for f in os.listdir(base_dir) if os.path.isfile(os.path.join(base_dir, f))):
#                 python_modules = []
#                 for root, dirs, files in os.walk(base_dir):
#                     if '__pycache__' in root or '.git' in root:
#                         continue
#                     for file in files:
#                         if file.endswith('.py') and not file.startswith('_') and file != 'setup.py':
#                             file_path = os.path.join(root, file)
#                             rel_path = os.path.relpath(file_path, base_dir)
#                             python_modules.append(rel_path)
#                             if len(python_modules) >= 10:  # Limit to first 10
#                                 break
#                     if len(python_modules) >= 10:
#                         break
                
#                 if python_modules:
#                     results.append(f"**Key Python Files:** {', '.join(python_modules[:5])}" + 
#                                  (f" (and {len(python_modules) - 5} more)" if len(python_modules) > 5 else ""))
            
#             return "\n".join(results)
            
#         except Exception as e:
#             return f"Error finding project entry points: {str(e)}"


def get_biscuit_tools(base: App) -> list[BiscuitTool]:
    """Get all available Biscuit tools for the AI agent."""
    tools = [
        # Core file operations
        FileReadTool(),
        FileWriteTool(),
        FileCreateTool(),
        FileReadRangeTool(),
        DirectoryListTool(),
        GetDirectoryTreeTool(),
        
        # Code search and analysis
        SearchCodeTool(),
        FindInFilesTool(),
        AnalyzeCodeTool(),
        # GetSymbolDefinitionTool(),  # Stub - confuses agent
        # GetSymbolReferencesTool(),  # Stub - confuses agent
        
        # Editor operations
        OpenFileTool(),
        OpenNewEditorTool(),
        GetActiveEditorTool(),
        
        # Code modification
        # ReplaceInFilesTool(),  # Stub - confuses agent
        # RefactorRenameTool(),  # Stub - confuses agent
        # ExtractMethodTool(),  # Stub - confuses agent
        FormatCodeTool(),
        
        # Code quality
        # LintCodeTool(),  # Stub - confuses agent
        # GenerateDocstringTool(),  # Stub - confuses agent
        # OptimizeCodeTool(),  # Stub - confuses agent
        # SecurityAuditTool(),  # Stub - confuses agent
        
        # Testing
        RunTestsTool(),
        # GenerateTestsTool(),  # Stub - confuses agent
        
        # Git operations
        GitStatusTool(),
        GitCommitTool(),
        GitBranchTool(),
        
        # Project management
        # CreateProjectStructureTool(),  # Stub - confuses agent
        InstallPackageTool(),
        # CreateFileTemplateTool(),  # Stub - confuses agent
        AnalyzeProjectTool(),
        
        # System operations
        ExecuteCommandTool(),
        GetWorkspaceInfoTool(),
        # DebugAnalysisTool(),  # Stub - confuses agent
        # FindProjectEntryPointsTool(), # intentionally commented out 
    ]
    
    # Set the base reference for all tools
    for tool in tools:
        tool.base = base
    
    return tools
