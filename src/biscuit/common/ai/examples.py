"""
Agent Reasoning Examples - How to Approach Different Tasks
===========================================================

This file provides examples of how the agent should reason through different types of requests.
These examples demonstrate the proper exploration and analysis pattern.
"""

# Example 1: Feature Implementation
FEATURE_EXAMPLE = """
USER REQUEST: "Add a dark mode toggle to the application"

AGENT REASONING:
1. explore_codebase → "I need to understand this project structure first"
   - Uses get_workspace_info to understand the current workspace
   - Uses analyze_project to understand the type of application
   - Uses get_directory_tree to see overall structure
   - Uses search_code to find main entry points and imports

2. search_patterns → "Let me find UI/theme related code"
   - Search for: "theme", "dark", "mode", "ui", "style"
   - Search for: "color", "background", "appearance"

3. analyze_context → "Now I'll read the relevant files I found"
   - Read theme/styling files found in step 2
   - Read main UI components
   - Look for existing theming infrastructure

4. plan_changes → "Based on what I found, here's my plan"
   - If theme system exists: extend it with dark mode
   - If no theme system: create one with dark/light modes
   - Identify all UI files that need dark mode styles

5. implement_changes → "Now I'll make the changes systematically"
   - Add theme toggle component
   - Add dark mode styles
   - Update configuration
   - Test the toggle functionality
"""

# Example 2: Bug Fix
BUG_FIX_EXAMPLE = """
USER REQUEST: "The save button is not working in the editor"

AGENT REASONING:
1. search_patterns → "Let me find the save functionality"
   - Search for: "save", "save_file", "write_file", "editor"
   - Search for: button-related code in editor

2. analyze_context → "I'll examine the save implementation"
   - Read the save button component code
   - Read the save function implementation
   - Look for error handling and event binding

3. search_patterns → "Let me check for error messages or logs"
   - Search for: "error", "exception", "fail", "save"
   - Look for console.log or logging statements

4. implement_changes → "Based on my analysis, I'll fix the issue"
   - Could be: missing event handler binding
   - Could be: incorrect file path handling
   - Could be: permission or access issues
   - Fix the specific problem identified
"""

# Example 3: Code Exploration
EXPLORATION_EXAMPLE = """
USER REQUEST: "How does the file management system work?"

AGENT REASONING:
1. explore_codebase → "Let me get the big picture first"
   - Get workspace info and project structure
   - Look for main directories and key files
   - Use search_code to find file-related patterns

2. search_patterns → "Find file management related code"
   - Search for: "file", "directory", "folder", "path"
   - Search for: "open", "create", "delete", "rename"

3. analyze_context → "Examine the file management components"
   - Read file manager/explorer components
   - Read file operation utilities
   - Look at file system abstraction layers

4. review_progress → "Summarize my findings"
   - Explain the file management architecture
   - Show key components and their relationships
   - Highlight important functions and classes
"""

# Anti-patterns - What NOT to do
ANTI_PATTERNS = """
❌ BAD APPROACH:
- "I'll read src/main.py" (assumes file exists and location)
- "Let me check the config.json file" (assumes existence)
- "I'll modify the authentication system" (without exploring first)

✅ GOOD APPROACH:  
- "Let me explore the project structure first"
- "I'll search for authentication-related code"
- "After finding the auth files, I'll read them to understand the current system"
- "Based on my analysis, I'll plan the modifications"
"""

# Tool Usage Patterns
TOOL_PATTERNS = """
EXPLORATION PHASE:
- search_code(pattern) → Find relevant code patterns, main files, imports
- find_in_files(pattern) → Search for specific text across files  
- directory_list(path) → Verify directories exist
- get_directory_tree(path) → Understand structure
- analyze_project() → Get project overview

ANALYSIS PHASE:
- file_read(path) → Read files found during exploration
- analyze_code(path) → Get code structure analysis
- file_read_range(path, start, end) → Read specific sections

IMPLEMENTATION PHASE:
- file_write(path, content) → Write new or modified files
- file_create(path, content) → Create new files
- format_code(path) → Format after changes
- run_tests() → Verify changes work

VERIFICATION PHASE:
- git_status() → Check what changed
- run_tests() → Run test suites
- execute_command() → Run specific validation commands
"""
