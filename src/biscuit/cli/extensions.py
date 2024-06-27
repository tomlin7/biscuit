from __future__ import annotations

import typing

import click

from biscuit import get_app_instance

if typing.TYPE_CHECKING:
    from biscuit import App


@click.group(invoke_without_command=True)
@click.help_option("-h", "--help")
def ext():
    """Commands for managing biscuit extensions"""
    ...


@ext.result_callback()
@click.pass_context
def process_extension_commands(ctx, processors):
    """Process the extension commands"""

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
    """List all extensions or installed or filter by user"""

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
@click.argument("name")
def info(name: str) -> typing.Callable[[App], None]:
    """Show information about an extension by name"""

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
    """Install an extension by name"""

    def f(app: App, name=name) -> None:
        if app.extensions_manager.install_extension_from_name(name):
            click.echo(f"Installed extension {name} successfully")
        else:
            click.echo(f"Could not find extension {name}")

    return f


@ext.command()
@click.argument("name")
def uninstall(name: str) -> typing.Callable[[App], None]:
    """Uninstall an extension by name"""

    def f(app: App, name=name) -> None:
        if app.extensions_manager.uninstall_extension_from_name(name):
            click.echo(f"Uninstalled extension {name} successfully")
        else:
            click.echo(f"Could not find extension {name}")

    return f


@ext.command()
def create():
    """Create a new extension from template"""

    click.echo("Extension created!")


@ext.command()
def test():
    """Test the extension"""

    click.echo("Extension tested!")


def register(cli: click.Group):
    cli.add_command(ext)
