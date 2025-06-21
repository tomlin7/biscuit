from __future__ import annotations

import typing

import click

from biscuit import get_app_instance

if typing.TYPE_CHECKING:
    from biscuit import App


@click.group(invoke_without_command=True)
@click.help_option("-h", "--help")
def ext():
    """Commands for managing biscuit extensions

    This command group allows you to manage biscuit extensions.

    Example:
        biscuit ext list \n
        biscuit ext install extension_name \n
        biscuit ext uninstall extension_name
    """
    ...


@ext.result_callback()
@click.pass_context
def process_extension_commands(ctx, processors):
    if ctx.invoked_subcommand is None:
        # show help
        click.echo(ctx.get_help())
        exit()

    app = get_app_instance()
    app.withdraw()
    print("\nLoading extensions...")

    while not app.extensions_manager.extensions_loaded:
        ...

    if processors:
        if isinstance(processors, list):
            for processor in processors:
                processor(app)
        else:
            processors(app)

    exit()


@ext.command("list")
@click.option("-u", "--user", help="Filter by user")
@click.option("-i", "--installed", is_flag=True, help="Show installed extensions")
def list_ext(user, installed) -> typing.Callable[[App], typing.List[str]]:
    """List all extensions or installed or filter by user

    Example:
        biscuit ext list \n
        biscuit ext list -u user \n
        biscuit ext list -i

    Args:
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

    Example:
        biscuit ext info extension_name

    Args:
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

    Example:
        biscuit ext install extension_name

    Args:
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

    Example:
        biscuit ext uninstall extension_name

    Args:
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
def new(name: str | None, template: str, output: str, description: str | None, author: str | None, version: str | None, force: bool) -> typing.Callable[[App], None]:
    """Create a new Biscuit extension project from a scaffold template.

    Examples::

        biscuit ext new my_extension                # uses default template
        biscuit ext new my_extension -t widget      # uses a named template
        biscuit ext new my_extension -t https://github.com/user/repo.git
    """

    from pathlib import Path

    from biscuit.extensions.scaffolder import create_extension

    def _processor(app: App, **kwargs):  # noqa: ANN001
        # Prompt for missing name if needed
        ext_name = name or click.prompt("Extension name", type=str)

        dest = Path(output).expanduser().resolve()

        # Collect missing context via interactive prompts ---------------------
        ctx: dict[str, str] = {}

        # Description
        desc_val = description or click.prompt("Description", default="A Biscuit extension.")
        ctx["description"] = desc_val

        # Author
        author_val = author or click.prompt("Author (Name <email>)", default="Your Name <email@example.com>")
        ctx["author"] = author_val

        # Version
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

    return _processor


@ext.command()
def test():
    """Test the extension

    This command will test your custom extension

    NOTE: This command is not yet implemented
    """

    click.echo("Extension tested!")


def register(cli: click.Group):
    cli.add_command(ext)
