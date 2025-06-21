from __future__ import annotations

import importlib.util as _importlib_util
import shutil
import sys
import typing
from pathlib import Path

import click

from biscuit import get_app_instance

if typing.TYPE_CHECKING:
    from biscuit import App


@click.group(invoke_without_command=True)
@click.help_option("-h", "--help")
def ext():
    """Commands for managing and developing biscuit extensions

    This command group allows you to manage and develop biscuit extensions.

    Examples::

        biscuit ext list
        biscuit ext install extension_name
        biscuit ext uninstall extension_name

    Extension Dev commands::

        biscuit ext new my_extension
        biscuit ext dev
        biscuit ext test
    """
    ...


@ext.result_callback()
@click.pass_context
def process_extension_commands(ctx, processors):
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())
        return

    # the invoked command returned NO processor (e.g. handled all logic
    # internally), skip creating the Biscuit application instance.
    if not processors:
        return

    # at this point we know the processors expect an App instance.
    app = get_app_instance()
    app.withdraw()
    print("\nLoading extensions...")

    while not app.extensions_manager.extensions_loaded:
        ...

    if isinstance(processors, list):
        for processor in processors:
            processor(app)
    else:
        processors(app)


@ext.command("list")
@click.option("-u", "--user", help="Filter by user")
@click.option("-i", "--installed", is_flag=True, help="Show installed extensions")
def list_ext(user, installed) -> typing.Callable[[App], typing.List[str]]:
    """List all extensions or installed or filter by user

    Example::
    
        biscuit ext list
        biscuit ext list -u user
        biscuit ext list -i

    Args::

        user (str): Filter by user
        installed (bool): Show installed extensions
    """

    if user:
        click.echo(f"Listing extensions by {user}\n")

        def f(app: App, user=user) -> None:
            for i, data in enumerate(
                app.extensions_manager.list_extensions_by_user(user)
            ):
                click.echo(f"[{i}] {data[0]}: " + data[1][-1])

        return f

    elif installed:
        click.echo("Listing installed extensions\n")

        def f(app: App) -> None:
            for i, data in enumerate(
                app.extensions_manager.list_installed_extensions()
            ):
                click.echo(
                    f"[{i}] {data[0]}: " + ", ".join(data[1]) if data[1] else " ... "
                )

        return f
    else:
        click.echo("Listing all extensions\n")

        def f(app: App) -> None:
            for i, data in enumerate(app.extensions_manager.list_all_extensions()):
                click.echo(f"[{i}] {data[0]}: " + ", ".join(data[1][1:]))

        return f


@ext.command()
@click.argument("name", required=False)
def info(name: str | None) -> typing.Callable[[App], None]:
    """Show information about an extension by name

    Example::

        biscuit ext info extension_name

    Args::

        name (str): The name of the extension"""

    def f(app: App, name=name) -> None:
        data = app.extensions_manager.find_extension_by_name(name)
        if data:
            click.echo(f"Name: {name}")
            click.echo(f"Author: {data[1]}")
            click.echo(f"Description: {data[2]}")
            # TODO: click.echo(f"Version: {data[3]}")
        else:
            click.echo(f"Could not find extension {name}")

    return f


@ext.command()
@click.argument("name")
def install(name: str) -> typing.Callable[[App], None]:
    """Install an extension by name

    Example::

        biscuit ext install extension_name

    Args::

        name (str): The name of the extension
    """

    def f(app: App, name=name) -> None:
        if app.extensions_manager.install_extension_from_name(name):
            click.echo(f"Installed extension {name} successfully")
        else:
            click.echo(f"Could not find extension {name}")

    return f


@ext.command()
@click.argument("name")
def uninstall(name: str) -> typing.Callable[[App], None]:
    """Uninstall an extension by name

    Example::

        biscuit ext uninstall extension_name

    Args::

        name (str): The name of the extension
    """

    def f(app: App, name=name) -> None:
        if app.extensions_manager.uninstall_extension_from_name(name):
            click.echo(f"Uninstalled extension {name} successfully")
        else:
            click.echo(f"Could not find extension {name}")

    return f


@ext.command()
@click.argument("name", required=False)
@click.option(
    "-t",
    "--template",
    default="default",
    help="Template name or git URL for the scaffold (default: 'default').",
)
@click.option(
    "-o",
    "--output",
    default=".",
    type=click.Path(file_okay=False, resolve_path=True),
    help="Destination directory where the scaffolded extension will be created.",
)
@click.option("-d", "--description", help="Short description of the extension.")
@click.option("-a", "--author", help="Author (Name <email@example.com>).")
@click.option("-v", "--version", help="Initial version (default: 0.1.0).", default=None)
@click.option("--force", is_flag=True, help="Overwrite destination if it already exists.")
def new(name: str | None, template: str, output: str, description: str | None, author: str | None, version: str | None, force: bool) -> None:
    """Create a new Biscuit extension project from a scaffold template.

    Examples::

        biscuit ext new my_extension                # uses default template
        biscuit ext new my_extension -t widget      # uses a named template
        biscuit ext new my_extension -t https://github.com/user/repo.git
    """

    from biscuit.extensions.scaffolder import create_extension

    ext_name = name or click.prompt("Extension name", type=str)
    dest = Path(output).expanduser().resolve() 

    # interactive prompts
    ctx: dict[str, str] = {}
    desc_val = description or click.prompt("Description", default="A Biscuit extension.")
    ctx["description"] = desc_val

    author_val = author or click.prompt("Author (Name <email>)", default="Your Name <email@example.com>")
    ctx["author"] = author_val

    ver_val = version or click.prompt("Version", default="0.1.0")
    ctx["version"] = ver_val

    click.echo(f"Creating extension '{ext_name}' using template '{template}' …")
    ok = create_extension(
        ext_name,
        template=template,
        output_dir=dest,
        force=force,
        extra_context=ctx,
    )

    if ok:
        click.echo(f"Extension scaffold created at {dest / ext_name}")
    else:
        click.echo("Failed to create extension scaffold.")

    return None


@ext.command()
def dev():
    """Start the extension development server
    
    This command will load the extension located in the current working directory and
    start Biscuit in development mode. The command assumes that the
    current directory is the root of the extension project (i.e. it
    contains a ``pyproject.toml`` or a ``src/<name>/`` package with a
    ``setup`` entrypoint).
    """

    click.echo("Extension development server started!")

    def f(app: App) -> None:
        """Load the extension located in the current working directory and
        start Biscuit in development mode. The command assumes that the
        current directory is the root of the extension project (i.e. it
        contains a ``pyproject.toml`` or a ``src/<name>/`` package with a
        ``setup`` entrypoint)."""

        cwd = Path.cwd()

        src_dir = cwd / "src"
        ext_name: str | None = None

        if src_dir.is_dir():
            for candidate in src_dir.iterdir():
                if candidate.is_dir() and (candidate / "__init__.py").exists():
                    ext_name = candidate.name
                    break

        if not ext_name:
            click.echo(
                "Could not find any Python package inside the 'src' directory. "
                "Ensure your extension code is located at src/<extension_name>/"
            )
            return

        init_py = src_dir / ext_name / "__init__.py"

        if not init_py.exists():
            click.echo(
                "Could not locate extension package. Expected "
                f"{init_py}. Ensure you are in the root of an extension repo."
            )
            return

        for p in (str(cwd), str(src_dir)):
            if p not in sys.path:
                sys.path.insert(0, p)

        spec = _importlib_util.spec_from_file_location(f"src.{ext_name}", init_py)
        if spec is None or spec.loader is None:
            click.echo("Failed to create import spec for the extension module.")
            return

        module = _importlib_util.module_from_spec(spec)
        try:
            spec.loader.exec_module(module) 
        except Exception as exc:
            click.echo(f"Importing extension failed: {exc}")
            return

        if hasattr(module, "setup") and callable(module.setup):
            try:
                module.setup(app.api)
                click.echo(f"Loaded extension '{ext_name}'.")
            except Exception as exc:
                click.echo(f"setup() raised an exception: {exc}")
                return
        else:
            click.echo("Extension module does not define a callable setup(api) function.")
            return

        app.deiconify()
        app.run()

    return f


@ext.command()
@click.option("-k", "--keyword", help="Only run tests which match the given keyword expression.")
@click.option("-v", "--verbose", is_flag=True, help="Run tests with verbose output.")
def test(keyword: str | None, verbose: bool):
    """Run the extension's pytest suite.

    Stand in the root of your extension project and run::

        biscuit ext test

    The command locates the ``tests`` directory (or any *test_*.py / *_test.py*
    files) under the current working directory and executes them with
    **pytest**. You can forward a *-k* keyword expression and enable *verbose*
    output via *-v*.
    """

    from pathlib import Path

    import pytest

    cwd = Path.cwd()

    if not (cwd / "tests").exists():
        click.echo("No 'tests' directory found in current location - nothing to test.")
        return None

    click.echo("Running pytest…")

    args: list[str] = []
    if verbose:
        args.append("-v")
    if keyword:
        args.extend(["-k", keyword])

    exit_code = pytest.main(args, plugins=None)

    if exit_code == 0:
        click.echo("All tests passed! 🎉")
    else:
        click.echo(f"Tests failed with exit code {exit_code}.")
        sys.exit(exit_code)

    return None

@ext.command()
@click.option("--skip-tests", is_flag=True, help="Skip running tests before preparing publish instructions.")
def publish(skip_tests: bool):
    """Guide for publishing the extension to the Biscuit marketplace.

    Biscuit extensions are distributed via the central
    `biscuit-extensions` repository which aggregates extension **git
    submodules** (see <https://github.com/tomlin7/biscuit-extensions>).  This
    command validates the current project, optionally runs the test-suite and
    then prints step-by-step instructions on how to add your repository as a
    submodule and update `extensions.toml`.
    """

    cwd = Path.cwd()

    # validation
    src_dir = cwd / "src"
    pkg_name: str | None = None
    if src_dir.is_dir():
        for candidate in src_dir.iterdir():
            if candidate.is_dir() and (candidate / "__init__.py").exists():
                pkg_name = candidate.name
                break

    if pkg_name is None:
        click.echo("Could not determine the extension package inside 'src/'. Aborting.")
        return

    pyproject = cwd / "pyproject.toml"
    meta: dict[str, str] = {}
    if pyproject.exists():
        try:
            import toml
            p_data = toml.load(pyproject).get("tool", {}).get("poetry", {})
            meta = {
                "name": p_data.get("name", pkg_name),
                "author": ", ".join(p_data.get("authors", [])) or "<your-name>",
                "description": p_data.get("description", "A Biscuit extension."),
                "version": p_data.get("version", "0.1.0"),
            }
        except Exception:
            meta = {
                "name": pkg_name,
                "author": "<your-name>",
                "description": "A Biscuit extension.",
                "version": "0.1.0",
            }
    else:
        meta = {
            "name": pkg_name,
            "author": "<your-name>",
            "description": "A Biscuit extension.",
            "version": "0.1.0",
        }

    # optional tests
    if not skip_tests and (cwd / "tests").exists():
        click.echo("Running tests before publishing …")
        import pytest
        exit_code = pytest.main([], plugins=None)
        if exit_code != 0:
            click.echo("Tests failed – resolve them before publishing.")
            sys.exit(exit_code)

    # publishing instructions
    click.echo("\nYour extension is ready to be published! Follow these steps:\n")

    repo_url_placeholder = "<your-extension-git-url>"
    instructions = f"""
1. Fork the central repository:
       https://github.com/tomlin7/biscuit-extensions

2. Clone *your fork* locally:
       git clone https://github.com/<your-github-username>/biscuit-extensions.git
       cd biscuit-extensions

3. Add your extension as a git submodule:
       git submodule add {repo_url_placeholder} extensions/{pkg_name}

4. Initialise & update submodules:
       git submodule update --init --remote

5. Register your extension by editing *extensions.toml* and appending:

       [{pkg_name}]
       submodule = "{pkg_name}"
       name = "{meta['name']}"
       author = "{meta['author']}"
       description = "{meta['description']}"
       version = "{meta['version']}"

6. Commit and push the changes:
       git add extensions/{pkg_name} extensions.toml .gitmodules
       git commit -m "Add {pkg_name} extension"
       git push origin main

7. Open a Pull Request from your fork against the *tomlin7/biscuit-extensions* `main` branch.

Once the PR is reviewed and merged, your extension will appear in the Biscuit marketplace! ✨
"""

    click.echo(instructions)

    return None


@ext.command()
@click.option("--skip-tests", is_flag=True, help="Skip running tests before preparing update instructions.")
def update(skip_tests: bool):
    """Guide for updating an *already published* extension.

    Produces a checklist for bumping your extension to a new version in the
    `biscuit-extensions` repository. Similar to *publish*, but assumes the
    extension submodule already exists and only needs a version/commit
    update.
    """

    from pathlib import Path

    cwd = Path.cwd()

    src_dir = cwd / "src"
    pkg_name: str | None = None
    if src_dir.is_dir():
        for candidate in src_dir.iterdir():
            if candidate.is_dir() and (candidate / "__init__.py").exists():
                pkg_name = candidate.name
                break

    if pkg_name is None:
        click.echo("Could not determine the extension package inside 'src/'. Aborting.")
        return

    # extract current version from pyproject
    new_version = "0.1.0"
    pyproject = cwd / "pyproject.toml"
    if pyproject.exists():
        try:
            import toml
            new_version = toml.load(pyproject).get("tool", {}).get("poetry", {}).get("version", new_version)
        except Exception:
            pass

    # optional tests
    if not skip_tests and (cwd / "tests").exists():
        click.echo("Running tests before update …")
        import pytest
        exit_code = pytest.main([], plugins=None)
        if exit_code != 0:
            click.echo("Tests failed - resolve them before updating.")
            sys.exit(exit_code)

    click.echo("\nFollow these steps to update your extension in the marketplace:\n")

    instructions = f"""
1. Push latest changes of your extension repository (make sure tag/branch with the new version {new_version} is published).

2. Open your fork of *biscuit-extensions*:
       https://github.com/<your-github-username>/biscuit-extensions

3. Pull latest updates from upstream and update the submodule to the new commit:
       git checkout main
       git remote add upstream https://github.com/tomlin7/biscuit-extensions.git
       git pull upstream main
       git submodule update --init --remote extensions/{pkg_name}

4. Edit *extensions.toml* to bump the reported version to "{new_version}".

5. Commit the changes:
       git add extensions/{pkg_name} extensions.toml
       git commit -m "Update {pkg_name} to {new_version}"
       git push origin main

6. Open a Pull Request to *tomlin7/biscuit-extensions* `main` branch.

Once merged, users will receive the updated version automatically in Biscuit.
"""

    click.echo(instructions)

    return None


def register(cli: click.Group):
    cli.add_command(ext)
