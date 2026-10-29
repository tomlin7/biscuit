# Original User Request

## 2026-10-18T22:25:22Z

Transform the top 25 high-traffic extensions in the Biscuit ecosystem into fully featured, production-grade extensions with rich business logic, UI integrations, automated test suites, and declared dependencies adhering to Biscuit's new isolated dependency specification.

Use a team of agents ("use teeam").

Working directory: c:\Users\BIT\Documents\github\biscuit-extensions
Integrity mode: development

Core Constraints:
1. STRICT CONSTRAINT: Do NOT mention "zed" anywhere in code, comments, commit messages, or documentation.
2. Commits: Always commit using `git commit --no-gpg-sign -m "..."`. Never use GPG signing to prevent deadlocks.
3. Network/Proxy: A local DNS proxy is running at `127.0.0.1:18888`. Always set `$env:HTTPS_PROXY = "http://127.0.0.1:18888"` before executing git or gh network operations.
4. Testing: Ensure all unit tests (`pytest tests/`) pass with 100% success before committing each extension.
5. In each extension's `extension.toml`, set `author = "tomlin7"` and declare `[dependencies]` with required `python` packages and system `tools` per `SPECIFICATION.md`.
6. Implement actual functional algorithms, CLI runners, parsers, and editor API integrations (avoid placeholder mock returns).

## Requirements

### R1. Rich Extension Feature Implementation
Implement production-grade business logic and Biscuit UI integration (commands, views, statusbar, and editor bindings) for the top 25 extensions under `extensions/`, declaring dependencies in `extension.toml` according to `SPECIFICATION.md`:

1. `docker`: Container lifecycle controls (start, stop, restart, logs), image inspection, compose service management.
2. `python`: Python interpreter detection, execution runner, pytest discovery and test runner.
3. `prettier`: Formatting engine, multi-language configuration loader (.prettierrc).
4. `eslint`: Diagnostic problem scanner, rule linter, error annotations.
5. `gitlens`: Inline git blame parsing, commit details, author history.
6. `git_graph`: Git log branch DAG parser, commit tree visualizer.
7. `tailwind_css`: Utility class autocompletion, hex color matcher, class conflict checks.
8. `thunder_client`: REST request builder, HTTP execution, headers/body response inspector.
9. `live_server`: Local static HTTP server lifecycle with reload hooks.
10. `diff_viewer`: Side-by-side visual difference computation and patch viewer.
11. `error_lens`: Real-time diagnostic message line decorator and warning display.
12. `markdown_tools`: Markdown table formatter, TOC generator, document outline.
13. `todo_tracker`: Workspace scanner for TODO, FIXME, HACK annotations with line navigation.
14. `spell_checker`: Typo detector, custom dictionary support, suggestions.
15. `bookmarks`: Line bookmark toggle, jumping, file bookmark registry.
16. `emmet_biscuit`: HTML/CSS abbreviation parser and expansion engine.
17. `jupyter`: Notebook cell parsing, kernel execution hooks.
18. `remote_ssh`: Host config parser, SSH connection manager, remote terminal launcher.
19. `live_sass`: Sass/SCSS compilation to CSS with source mapping.
20. `drawio`: Diagram XML model generator and cell visualizer.
21. `go`: Go package detection, `go test` and `go run` runners.
22. `csharp`: .NET solution discovery, `dotnet build` and `dotnet run` commands.
23. `github_pull_requests`: PR URL parsing, diff checkout, status inspection.
24. `snippet_manager`: Custom snippet repository, keyword expansion.
25. `json_viewer`: JSON formatting, tree viewer, syntax validation.

### R2. Test Suites & Verification
Write comprehensive unit tests in `tests/test_<name>.py` for each of the 25 extensions verifying all features, handlers, dependency loading, and edge cases pass with `pytest`.

### R3. Submodule & Git Synchronization
- Commit changes in each extension repository with `--no-gpg-sign`.
- Push each to `origin main` using `$env:HTTPS_PROXY = "http://127.0.0.1:18888"`.
- Update git submodules and `extensions.toml` in `biscuit-extensions`, commit and push.
