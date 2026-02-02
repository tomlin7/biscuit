"""
Biscuit Tools for AI Coding Agent
=================================

Comprehensive tools for the Biscuit AI coding agent.
Includes file operations, code search, terminal commands, and task management.
"""

from __future__ import annotations

import fnmatch
import json
import os
import re
import subprocess
import typing
from pathlib import Path
from typing import Any, ClassVar, Dict, List, Optional


from pydantic import BaseModel, Field

if typing.TYPE_CHECKING:
    from biscuit import App


# --- Input Schemas ---

class ReadFileInput(BaseModel):
    target_file: str = Field(description="The path of the file to read")
    offset: Optional[int] = Field(default=None, description="Line number to start reading from (1-indexed)")
    limit: Optional[int] = Field(default=None, description="Number of lines to read")


class EditFileInput(BaseModel):
    target_file: str = Field(description="The target file to modify")
    instructions: str = Field(description="Single sentence describing the edit")
    code_edit: str = Field(description="The code edit with `// ... existing code ...` markers for unchanged sections")


class DeleteFileInput(BaseModel):
    target_file: str = Field(description="The path of the file to delete")
    explanation: Optional[str] = Field(default=None, description="Why this file is being deleted")


class ListDirInput(BaseModel):
    target_directory: str = Field(description="Path to directory to list contents of")
    ignore_globs: Optional[List[str]] = Field(default=None, description="Glob patterns to ignore")


class GlobFileSearchInput(BaseModel):
    glob_pattern: str = Field(description="The glob pattern to match files against")
    target_directory: Optional[str] = Field(default=None, description="Directory to search in")


class GrepInput(BaseModel):
    pattern: str = Field(description="Regex pattern to search for")
    path: Optional[str] = Field(default=None, description="File or directory to search in")
    glob: Optional[str] = Field(default=None, description="Glob pattern to filter files")
    output_mode: Optional[str] = Field(default="content", description="Output mode: content, files_with_matches, count")
    context_before: Optional[int] = Field(default=None, description="Lines before match (-B)", alias="-B")
    context_after: Optional[int] = Field(default=None, description="Lines after match (-A)", alias="-A")
    context: Optional[int] = Field(default=None, description="Lines before and after (-C)", alias="-C")
    case_insensitive: Optional[bool] = Field(default=False, description="Case insensitive search (-i)", alias="-i")
    file_type: Optional[str] = Field(default=None, description="File type to search (js, py, etc.)", alias="type")
    head_limit: Optional[int] = Field(default=None, description="Limit output to first N entries")
    multiline: Optional[bool] = Field(default=False, description="Enable multiline matching")


class CodebaseSearchInput(BaseModel):
    query: str = Field(description="A complete question about what you want to understand")
    target_directories: List[str] = Field(default_factory=list, description="Directory paths to limit search scope")
    explanation: str = Field(description="Why this search is being performed")


class RunTerminalCmdInput(BaseModel):
    command: str = Field(description="The terminal command to execute")
    is_background: bool = Field(default=False, description="Whether to run in background")
    explanation: Optional[str] = Field(default=None, description="Why this command needs to be run")


class TodoWriteInput(BaseModel):
    merge: bool = Field(description="Whether to merge with existing todos or replace")
    todos: List[Dict[str, Any]] = Field(description="Array of todo items with id, content, status")


class GetWorkspaceInfoInput(BaseModel):
    pass


class GetActiveEditorInput(BaseModel):
    pass


# --- Tool Base Class ---

class BiscuitTool:
    """Base class for Biscuit tools."""
    name: str
    description: str
    args_schema: typing.Type[BaseModel]
    base: typing.Any = None

    def run(self, args: Dict[str, Any]) -> str:
        """Execute the tool with the given arguments."""
        if isinstance(args, str):
            try:
                args = json.loads(args)
            except:
                # If it's a string that's not JSON, we might have a problem 
                # for multi-arg tools, but let's assume it matches first arg if it's simple
                return f"Error: Invalid input format. Expected JSON dict."
        
        return self._run(**args)

    class Config:
        arbitrary_types_allowed = True
        populate_by_name = True

    def _get_abs_path(self, path: str) -> str:
        """Resolve path relative to workspace active directory."""
        if os.path.isabs(path):
            return path

        base_dir = getattr(self.base, 'active_directory', None) or os.getcwd()
        return os.path.normpath(os.path.join(base_dir, path))

    def _shorten_output(self, text: str, max_chars: int = 4000) -> str:
        """Truncate output to avoid context overflow."""
        if len(text) <= max_chars:
            return text
        return text[:max_chars] + f"\n... (truncated {len(text) - max_chars} chars)"

    def _get_workspace_root(self) -> str:
        """Get the workspace root directory."""
        return getattr(self.base, 'active_directory', None) or os.getcwd()


# --- Tool Implementations ---

class ReadFileTool(BiscuitTool):
    name: str = "read_file"
    description: str = """Read contents of a file. Returns line-numbered content.
Use offset and limit for large files. Can read images (returns description)."""
    args_schema: ClassVar[type[BaseModel]] = ReadFileInput

    def _run(self, target_file: str, offset: Optional[int] = None, limit: Optional[int] = None) -> str:
        try:
            path = self._get_abs_path(target_file)
            if not os.path.exists(path):
                return f"Error: File '{target_file}' does not exist."

            # Check for binary/image files
            ext = os.path.splitext(path)[1].lower()
            if ext in {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico'}:
                return f"[Image file: {target_file}] - Image reading not supported in text mode."

            try:
                with open(path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
            except UnicodeDecodeError:
                return f"Error: File '{target_file}' appears to be binary."

            if not lines:
                return "File is empty."

            total_lines = len(lines)
            start_idx = (offset - 1) if offset and offset > 0 else 0
            end_idx = (start_idx + limit) if limit else total_lines
            end_idx = min(end_idx, total_lines)

            # Format with line numbers: LINE_NUMBER|LINE_CONTENT
            numbered_lines = []
            for i, line in enumerate(lines[start_idx:end_idx], start=start_idx + 1):
                numbered_lines.append(f"{i:4}|{line.rstrip()}")

            content = "\n".join(numbered_lines)

            if offset or limit:
                header = f"Lines {start_idx + 1}-{end_idx} of {total_lines} in {target_file}:\n"
            else:
                header = f"{target_file} ({total_lines} lines):\n"

            return self._shorten_output(header + content)

        except Exception as e:
            return f"Error reading file: {e}"


class EditFileTool(BiscuitTool):
    name: str = "edit_file"
    description: str = """Edit an existing file or create a new file.
Use `// ... existing code ...` to represent unchanged sections.
Provide clear instructions for the edit."""
    args_schema: ClassVar[type[BaseModel]] = EditFileInput

    def _run(self, target_file: str, instructions: str, code_edit: str) -> str:
        try:
            path = self._get_abs_path(target_file)
            is_new_file = not os.path.exists(path)

            if is_new_file:
                # Creating new file - code_edit is the full content
                clean_content = code_edit.replace("// ... existing code ...", "").strip()
                os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(clean_content)
                self._refresh_explorer()
                return f"Created new file: {target_file}"

            # Read existing file
            with open(path, 'r', encoding='utf-8') as f:
                original_content = f.read()

            # Apply the edit
            new_content = self._apply_sketched_edit(original_content, code_edit)

            if new_content == original_content:
                return f"Warning: No changes detected in {target_file}. The edit may not have matched."

            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)

            self._refresh_explorer()
            return f"Successfully edited {target_file}: {instructions}"

        except Exception as e:
            return f"Error editing file: {e}"

    def _apply_sketched_edit(self, original: str, edit: str) -> str:
        """Apply a sketched edit with `// ... existing code ...` markers."""
        # Split edit into sections
        marker_pattern = r'(?://|#|--|/\*)\s*\.\.\.\s*existing\s+code\s*\.\.\.(?:\s*\*/)?'
        sections = re.split(marker_pattern, edit, flags=re.IGNORECASE)

        if len(sections) == 1:
            # No markers - this is a complete replacement or new content
            return edit

        original_lines = original.split('\n')
        result_lines = []
        current_pos = 0

        for i, section in enumerate(sections):
            section = section.strip()
            if not section:
                continue

            section_lines = section.split('\n')

            # Find where this section starts in the original
            if i == 0:
                # First section - find its end in original and keep everything before
                match_end = self._find_section_end(original_lines, section_lines, 0)
                if match_end >= 0:
                    result_lines.extend(section_lines)
                    current_pos = match_end + 1
                else:
                    result_lines.extend(section_lines)
            else:
                # Middle/end sections - find start, keep original between
                match_start = self._find_section_start(original_lines, section_lines, current_pos)
                if match_start >= 0:
                    # Add original content between last position and this match
                    result_lines.extend(original_lines[current_pos:match_start])
                    result_lines.extend(section_lines)
                    current_pos = match_start + len(section_lines)
                else:
                    # Couldn't find match - append section
                    result_lines.extend(section_lines)

        # Add remaining original content
        if current_pos < len(original_lines):
            result_lines.extend(original_lines[current_pos:])

        return '\n'.join(result_lines)

    def _find_section_start(self, original: List[str], section: List[str], start_pos: int) -> int:
        """Find where a section starts in the original content."""
        if not section:
            return -1

        first_line = section[0].strip()
        for i in range(start_pos, len(original)):
            if original[i].strip() == first_line:
                # Check if following lines match
                match = True
                for j, sec_line in enumerate(section):
                    if i + j >= len(original) or original[i + j].strip() != sec_line.strip():
                        match = False
                        break
                if match:
                    return i
        return -1

    def _find_section_end(self, original: List[str], section: List[str], start_pos: int) -> int:
        """Find where a section ends in the original content."""
        if not section:
            return -1

        last_line = section[-1].strip()
        for i in range(start_pos, len(original)):
            if original[i].strip() == last_line:
                return i
        return -1

    def _refresh_explorer(self):
        if hasattr(self.base, 'explorer'):
            try:
                self.base.explorer.directory.refresh_root()
            except:
                pass


class DeleteFileTool(BiscuitTool):
    name: str = "delete_file"
    description: str = "Delete a file at the specified path."
    args_schema: ClassVar[type[BaseModel]] = DeleteFileInput

    def _run(self, target_file: str, explanation: Optional[str] = None) -> str:
        try:
            path = self._get_abs_path(target_file)
            if not os.path.exists(path):
                return f"Error: File '{target_file}' does not exist."

            if os.path.isdir(path):
                return f"Error: '{target_file}' is a directory. Use terminal command for directory deletion."

            os.remove(path)

            if hasattr(self.base, 'explorer'):
                try:
                    self.base.explorer.directory.refresh_root()
                except:
                    pass

            return f"Successfully deleted {target_file}"
        except Exception as e:
            return f"Error deleting file: {e}"


class ListDirTool(BiscuitTool):
    name: str = "list_dir"
    description: str = """List files and directories in a given path.
Does not display dot-files by default."""
    args_schema: ClassVar[type[BaseModel]] = ListDirInput

    def _run(self, target_directory: str, ignore_globs: Optional[List[str]] = None) -> str:
        try:
            path = self._get_abs_path(target_directory)
            if not os.path.exists(path) or not os.path.isdir(path):
                return f"Error: '{target_directory}' is not a valid directory."

            items = []
            ignore_patterns = ignore_globs or []

            for item in sorted(os.listdir(path)):
                # Skip dot files
                if item.startswith('.'):
                    continue

                # Check ignore patterns
                should_ignore = False
                for pattern in ignore_patterns:
                    if fnmatch.fnmatch(item, pattern.lstrip('**/')):
                        should_ignore = True
                        break

                if should_ignore:
                    continue

                full_path = os.path.join(path, item)
                if os.path.isdir(full_path):
                    items.append(f"{item}/")
                else:
                    items.append(item)

            if not items:
                return f"Directory '{target_directory}' is empty."

            return self._shorten_output("\n".join(items))
        except Exception as e:
            return f"Error listing directory: {e}"


class GlobFileSearchTool(BiscuitTool):
    name: str = "glob_file_search"
    description: str = """Search for files matching a glob pattern.
Returns matching file paths sorted by modification time."""
    args_schema: ClassVar[type[BaseModel]] = GlobFileSearchInput

    def _run(self, glob_pattern: str, target_directory: Optional[str] = None) -> str:
        try:
            root = self._get_abs_path(target_directory) if target_directory else self._get_workspace_root()

            if not os.path.exists(root):
                return f"Error: Directory '{target_directory}' does not exist."

            # Ensure pattern starts with **/ for recursive search
            if not glob_pattern.startswith('**/'):
                glob_pattern = '**/' + glob_pattern

            matches = []
            skip_dirs = {'.git', 'node_modules', '__pycache__', 'venv', '.venv', 'dist', 'build'}

            for dirpath, dirnames, filenames in os.walk(root):
                # Skip certain directories
                dirnames[:] = [d for d in dirnames if d not in skip_dirs and not d.startswith('.')]

                rel_dir = os.path.relpath(dirpath, root)

                for filename in filenames:
                    rel_path = os.path.join(rel_dir, filename) if rel_dir != '.' else filename

                    # Check if matches pattern
                    if fnmatch.fnmatch(rel_path, glob_pattern) or fnmatch.fnmatch(filename, glob_pattern.replace('**/', '')):
                        full_path = os.path.join(dirpath, filename)
                        mtime = os.path.getmtime(full_path)
                        matches.append((rel_path, mtime))

                if len(matches) > 200:
                    break

            # Sort by modification time (most recent first)
            matches.sort(key=lambda x: x[1], reverse=True)

            if not matches:
                return f"No files found matching '{glob_pattern}'"

            result = [m[0] for m in matches[:100]]
            return self._shorten_output("\n".join(result))
        except Exception as e:
            return f"Error searching files: {e}"


class GrepTool(BiscuitTool):
    name: str = "grep"
    description: str = """Search for patterns in files using regex.
Supports ripgrep-style options: -i (case insensitive), -A/-B/-C (context), output modes."""
    args_schema: ClassVar[type[BaseModel]] = GrepInput

    def _run(
        self,
        pattern: str,
        path: Optional[str] = None,
        glob: Optional[str] = None,
        output_mode: Optional[str] = "content",
        context_before: Optional[int] = None,
        context_after: Optional[int] = None,
        context: Optional[int] = None,
        case_insensitive: Optional[bool] = False,
        file_type: Optional[str] = None,
        head_limit: Optional[int] = None,
        multiline: Optional[bool] = False,
        **kwargs  # Handle aliases
    ) -> str:
        try:
            # Handle aliases from kwargs
            context_before = context_before or kwargs.get('-B')
            context_after = context_after or kwargs.get('-A')
            context = context or kwargs.get('-C')
            case_insensitive = case_insensitive or kwargs.get('-i', False)
            file_type = file_type or kwargs.get('type')

            search_path = self._get_abs_path(path) if path else self._get_workspace_root()

            # Build regex
            flags = re.IGNORECASE if case_insensitive else 0
            if multiline:
                flags |= re.MULTILINE | re.DOTALL

            try:
                regex = re.compile(pattern, flags)
            except re.error as e:
                return f"Invalid regex pattern: {e}"

            # Determine file filter
            file_extensions = None
            if file_type:
                type_map = {
                    'py': ['.py'], 'js': ['.js', '.jsx'], 'ts': ['.ts', '.tsx'],
                    'java': ['.java'], 'c': ['.c', '.h'], 'cpp': ['.cpp', '.hpp', '.cc'],
                    'go': ['.go'], 'rust': ['.rs'], 'rb': ['.rb'], 'php': ['.php'],
                    'html': ['.html', '.htm'], 'css': ['.css', '.scss', '.sass'],
                    'json': ['.json'], 'yaml': ['.yaml', '.yml'], 'md': ['.md'],
                    'xml': ['.xml'], 'sql': ['.sql'], 'sh': ['.sh', '.bash'],
                }
                file_extensions = type_map.get(file_type, [f'.{file_type}'])

            results = []
            file_counts = {}
            skip_dirs = {'.git', 'node_modules', '__pycache__', 'venv', '.venv', 'dist', 'build'}

            def should_include_file(filepath: str) -> bool:
                if glob:
                    return fnmatch.fnmatch(os.path.basename(filepath), glob) or fnmatch.fnmatch(filepath, glob)
                if file_extensions:
                    return any(filepath.endswith(ext) for ext in file_extensions)
                return True

            for dirpath, dirnames, filenames in os.walk(search_path):
                dirnames[:] = [d for d in dirnames if d not in skip_dirs and not d.startswith('.')]

                for filename in filenames:
                    if filename.startswith('.'):
                        continue

                    full_path = os.path.join(dirpath, filename)
                    rel_path = os.path.relpath(full_path, search_path)

                    if not should_include_file(rel_path):
                        continue

                    try:
                        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            lines = content.split('\n')
                    except:
                        continue

                    file_matches = []
                    for i, line in enumerate(lines, 1):
                        if regex.search(line):
                            file_matches.append((i, line))
                            file_counts[rel_path] = file_counts.get(rel_path, 0) + 1

                    if file_matches and output_mode == "content":
                        ctx_b = context_before or context or 0
                        ctx_a = context_after or context or 0

                        for line_num, line in file_matches:
                            if ctx_b or ctx_a:
                                # Add context lines
                                start = max(0, line_num - 1 - ctx_b)
                                end = min(len(lines), line_num + ctx_a)
                                for j in range(start, end):
                                    prefix = ':' if j == line_num - 1 else '-'
                                    results.append(f"{rel_path}{prefix}{j+1}{prefix}{lines[j][:200]}")
                            else:
                                results.append(f"{rel_path}:{line_num}:{line[:200]}")

                            if head_limit and len(results) >= head_limit:
                                break

                    if head_limit and len(results) >= head_limit:
                        break

                if head_limit and len(results) >= head_limit:
                    break

            if output_mode == "files_with_matches":
                files = list(file_counts.keys())
                if head_limit:
                    files = files[:head_limit]
                return "\n".join(files) if files else "No matches found."

            elif output_mode == "count":
                counts = [f"{path}: {count}" for path, count in file_counts.items()]
                if head_limit:
                    counts = counts[:head_limit]
                return "\n".join(counts) if counts else "No matches found."

            else:  # content mode
                return self._shorten_output("\n".join(results)) if results else "No matches found."

        except Exception as e:
            return f"Error searching: {e}"


class CodebaseSearchTool(BiscuitTool):
    name: str = "codebase_search"
    description: str = """Semantic search that finds code by meaning.
Use for "how/where/what" questions about the codebase.
For exact text, use grep instead."""
    args_schema: ClassVar[type[BaseModel]] = CodebaseSearchInput

    def _run(self, query: str, target_directories: List[str], explanation: str) -> str:
        """Perform semantic-like search by extracting keywords and searching."""
        try:
            # Extract keywords from the query
            stop_words = {'how', 'does', 'what', 'where', 'is', 'the', 'a', 'an', 'in', 'to', 'for', 'of', 'and', 'or', 'are', 'this', 'that', 'it', 'be', 'with', 'on', 'as', 'at', 'by', 'from'}
            words = re.findall(r'\b\w+\b', query.lower())
            keywords = [w for w in words if w not in stop_words and len(w) > 2]

            if not keywords:
                return "Could not extract meaningful keywords from query."

            search_root = self._get_workspace_root()
            if target_directories and target_directories[0]:
                search_root = self._get_abs_path(target_directories[0])

            results = []
            skip_dirs = {'.git', 'node_modules', '__pycache__', 'venv', '.venv', 'dist', 'build'}

            # Score files by keyword matches
            file_scores: Dict[str, Dict] = {}

            for dirpath, dirnames, filenames in os.walk(search_root):
                dirnames[:] = [d for d in dirnames if d not in skip_dirs and not d.startswith('.')]

                for filename in filenames:
                    if filename.startswith('.'):
                        continue

                    ext = os.path.splitext(filename)[1].lower()
                    if ext not in {'.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.hpp', '.rb', '.php', '.cs', '.swift', '.kt', '.scala', '.vue', '.svelte'}:
                        continue

                    full_path = os.path.join(dirpath, filename)
                    rel_path = os.path.relpath(full_path, self._get_workspace_root())

                    try:
                        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read().lower()
                    except:
                        continue

                    # Score based on keyword matches
                    score = 0
                    matched_lines = []
                    lines = content.split('\n')

                    for i, line in enumerate(lines, 1):
                        line_score = sum(1 for kw in keywords if kw in line.lower())
                        if line_score > 0:
                            score += line_score
                            if len(matched_lines) < 3:
                                matched_lines.append((i, line.strip()[:100]))

                    if score > 0:
                        file_scores[rel_path] = {
                            'score': score,
                            'matches': matched_lines
                        }

            # Sort by score and return top results
            sorted_files = sorted(file_scores.items(), key=lambda x: x[1]['score'], reverse=True)[:10]

            if not sorted_files:
                return f"No relevant code found for: {query}"

            output = [f"Search results for: {query}\n"]
            for filepath, data in sorted_files:
                output.append(f"\n## {filepath} (relevance: {data['score']})")
                for line_num, line in data['matches']:
                    output.append(f"  L{line_num}: {line}")

            return self._shorten_output("\n".join(output))

        except Exception as e:
            return f"Error in codebase search: {e}"


class RunTerminalCmdTool(BiscuitTool):
    name: str = "run_terminal_cmd"
    description: str = """Execute a terminal command.
For long-running commands, set is_background=true."""
    args_schema: ClassVar[type[BaseModel]] = RunTerminalCmdInput

    def _run(self, command: str, is_background: bool = False, explanation: Optional[str] = None) -> str:
        try:
            cwd = self._get_workspace_root()

            # Security check for dangerous commands
            dangerous_patterns = ['rm -rf /', 'rm -rf ~', 'mkfs', ':(){:|:&};:', '> /dev/sda']
            for pattern in dangerous_patterns:
                if pattern in command:
                    return f"Error: Refusing to execute potentially dangerous command."

            if is_background:
                # Run in background - don't wait for output
                if os.name == 'nt':  # Windows
                    subprocess.Popen(command, shell=True, cwd=cwd,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    subprocess.Popen(command + ' &', shell=True, cwd=cwd,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                return f"Started background process: {command}"

            # Run synchronously
            result = subprocess.run(
                command,
                shell=True,
                cwd=cwd,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace',
                timeout=60  # 60 second timeout
            )

            output = []
            if result.returncode != 0:
                output.append(f"Exit Code: {result.returncode}")
            if result.stdout:
                output.append(f"STDOUT:\n{result.stdout}")
            if result.stderr:
                output.append(f"STDERR:\n{result.stderr}")

            if not output:
                output.append("Command completed successfully (no output)")

            return self._shorten_output("\n".join(output))

        except subprocess.TimeoutExpired:
            return "Error: Command timed out after 60 seconds. Consider running in background."
        except Exception as e:
            return f"Error executing command: {e}"


class TodoWriteTool(BiscuitTool):
    name: str = "todo_write"
    description: str = """Create and manage a task list for complex coding sessions.
Use for multi-step tasks. Set merge=true to update existing todos."""
    args_schema: ClassVar[type[BaseModel]] = TodoWriteInput

    _todos: ClassVar[Dict[str, Dict]] = {}  # Class-level todo storage

    def _run(self, merge: bool, todos: List[Dict[str, Any]]) -> str:
        try:
            if not merge:
                TodoWriteTool._todos.clear()

            for todo in todos:
                todo_id = todo.get('id', str(len(TodoWriteTool._todos)))
                TodoWriteTool._todos[todo_id] = {
                    'id': todo_id,
                    'content': todo.get('content', ''),
                    'status': todo.get('status', 'pending')
                }

            # Format output
            output = ["Task List:"]
            status_icons = {
                'pending': '○',
                'in_progress': '◐',
                'completed': '●',
                'cancelled': '✗'
            }

            for tid, todo in TodoWriteTool._todos.items():
                icon = status_icons.get(todo['status'], '○')
                output.append(f"  {icon} [{tid}] {todo['content']} ({todo['status']})")

            return "\n".join(output)

        except Exception as e:
            return f"Error managing todos: {e}"


class GetWorkspaceInfoTool(BiscuitTool):
    name: str = "get_workspace_info"
    description: str = "Get information about current workspace and environment."
    args_schema: ClassVar[type[BaseModel]] = GetWorkspaceInfoInput

    def _run(self) -> str:
        cwd = self._get_workspace_root()

        info = [
            f"Workspace: {cwd}",
            f"Platform: {os.name}",
        ]

        # Check for common project files
        project_indicators = []
        if os.path.exists(os.path.join(cwd, 'package.json')):
            project_indicators.append('Node.js (package.json)')
        if os.path.exists(os.path.join(cwd, 'pyproject.toml')):
            project_indicators.append('Python (pyproject.toml)')
        if os.path.exists(os.path.join(cwd, 'requirements.txt')):
            project_indicators.append('Python (requirements.txt)')
        if os.path.exists(os.path.join(cwd, 'Cargo.toml')):
            project_indicators.append('Rust (Cargo.toml)')
        if os.path.exists(os.path.join(cwd, 'go.mod')):
            project_indicators.append('Go (go.mod)')
        if os.path.exists(os.path.join(cwd, 'pom.xml')):
            project_indicators.append('Java/Maven (pom.xml)')

        if project_indicators:
            info.append(f"Project Type: {', '.join(project_indicators)}")

        # Git info
        if os.path.exists(os.path.join(cwd, '.git')):
            try:
                result = subprocess.run(['git', 'branch', '--show-current'],
                                      cwd=cwd, capture_output=True, text=True)
                if result.returncode == 0:
                    info.append(f"Git Branch: {result.stdout.strip()}")
            except:
                pass

        # Count files
        try:
            file_count = len([f for f in os.listdir(cwd) if not f.startswith('.')])
            info.append(f"Root Items: {file_count}")
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
                return "No editors manager available."

            editor = self.base.editorsmanager.active_editor
            if not editor:
                return "No active editor."

            if hasattr(editor, 'path') and editor.path:
                info = [f"Active File: {editor.path}"]

                if hasattr(editor, 'content'):
                    if hasattr(editor.content, 'modified'):
                        info.append(f"Modified: {editor.content.modified}")
                    if hasattr(editor.content, 'language'):
                        info.append(f"Language: {editor.content.language}")

                return "\n".join(info)

            return "Active editor has no file path (unsaved or special editor)."
        except Exception as e:
            return f"Error getting active editor: {e}"


# --- Registry ---

def get_biscuit_tools(base: "App") -> List[BiscuitTool]:
    """Return list of all Biscuit agent tools."""
    tools = [
        ReadFileTool(),
        EditFileTool(),
        DeleteFileTool(),
        ListDirTool(),
        GlobFileSearchTool(),
        GrepTool(),
        CodebaseSearchTool(),
        RunTerminalCmdTool(),
        TodoWriteTool(),
        GetWorkspaceInfoTool(),
        GetActiveEditorTool(),
    ]

    for tool in tools:
        tool.base = base

    return tools
