from __future__ import annotations

"""biscuit.extensions.scaffolder
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Utility functions to scaffold a brand-new Biscuit extension project from a
remote template repository.  The generated project is **not** added as a git
sub-module; it is simply written to the desired output directory so that users
can start development immediately.

This helper will be used by the ``biscuit ext new`` CLI command.
"""

import shutil
import subprocess
import sys
from pathlib import Path

# Prefer cookiecutter for scaffolding
try:
    from cookiecutter.main import cookiecutter as _cookiecutter
except ModuleNotFoundError:  # pragma: no cover – handled gracefully at runtime
    _cookiecutter = None

__all__ = [
    "create_extension",
]


_DEFAULT_TEMPLATE_BASE_URL = "https://github.com/biscuit-extensions/"
_DEFAULT_TEMPLATE_REPO = "extension"
_TEMPLATE_PLACEHOLDER = "hello_biscuit"


def create_extension(
    name: str,
    *,
    template: str | None = None,
    output_dir: str | Path | None = None,
    force: bool = False,
    extra_context: dict[str, str] | None = None,
) -> bool:
    """Generate a brand-new extension project.

    Parameters
    ----------
    name:
        Identifier for the extension.  This will become the folder name under
        *output_dir* as well as the top-level python package name inside the
        template.
    template:
        Either a short template identifier (e.g. ``"default"`` or
        ``"widget"``) that maps to an official repository under
        ``_DEFAULT_TEMPLATE_BASE_URL`` *or* a full git URL (``https://…`` or
        ``git@…``).
    output_dir:
        Destination directory into which the new extension folder will be
        created.  Defaults to the current working directory.
    force:
        Overwrite existing destination directory if it already exists.
    extra_context:
        Additional context to pass to cookiecutter.

    Returns
    -------
    bool
        *True* on success, *False* otherwise.
    """

    tmpl_arg = template or "default"
    repo_url: str

    # a) treat a local path (relative or absolute) specially
    # if tmpl_arg and Path(tmpl_arg).expanduser().exists():
    #     repo_url = str(Path(tmpl_arg).expanduser().resolve())

    # b) a full git or HTTP/S URL (heuristic: contains "://" or "git@")
    if tmpl_arg.startswith("http://") or tmpl_arg.startswith("https://") or tmpl_arg.startswith("git@"):  # type: ignore[arg-type]
        repo_url = tmpl_arg  # type: ignore[assignment]

    # c) the special default identifier – falls back to the canonical template
    elif tmpl_arg in {"default", "template", "base"}:
        repo_url = _DEFAULT_TEMPLATE_BASE_URL + _DEFAULT_TEMPLATE_REPO

    # d) any other short-hand – assume an official biscuit template repository
    else:
        repo_url = _DEFAULT_TEMPLATE_BASE_URL + tmpl_arg.replace(" ", "-")

    dest_root = Path(output_dir or Path.cwd()).expanduser().resolve()
    dest_root.mkdir(parents=True, exist_ok=True)
    extension_dir = dest_root / name

    if extension_dir.exists():
        if not force:
            print(
                f"Error: destination '{extension_dir}' already exists. "
                "Use force=True to overwrite.",
                file=sys.stderr,
            )
            return False
        shutil.rmtree(extension_dir)

    if _cookiecutter is None:
        print(
            "cookiecutter is not installed; cannot scaffold an extension. "
            "Please install it first (pip install cookiecutter).",
            file=sys.stderr,
        )
        return False

    extra_ctx = {
        "extension_name": name,
        "project_slug": name,
        "package_name": name,
    }
    if extra_context:
        extra_ctx.update({k: v for k, v in extra_context.items() if v is not None})

    try:
        _cookiecutter(
            repo_url,
            no_input=True,
            extra_context=extra_ctx,
            output_dir=str(dest_root),
        )
    except Exception as exc:
        print(f"Failed to scaffold extension: {exc}", file=sys.stderr)
        return False

    return extension_dir.exists()


    

