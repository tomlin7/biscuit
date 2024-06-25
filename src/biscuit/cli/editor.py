from __future__ import annotations

import typing

import click

from biscuit.git import URL

if typing.TYPE_CHECKING:
    from biscuit import App


@click.command()
@click.argument(
    "path",
    type=click.Path(
        exists=True,
        dir_okay=True,
        resolve_path=True,
    ),
    required=False,
)
def open(path=None) -> typing.Callable[[App, str], None]:
    """Open a file or folder in the editor"""

    return lambda app, path=path: app.open(path)


@click.command()
@click.argument(
    "path",
    type=click.Path(
        exists=True,
        dir_okay=False,
        resolve_path=True,
    ),
    required=False,
)
@click.argument("linecol", type=str, required=False)
def goto(path=None, linecol=None) -> typing.Callable[[App, str], None]:
    """Open a file and go to a specific location"""

    if not path:
        path = click.prompt("path/to/file", type=str)
    if not linecol:
        linecol = click.prompt("line:column", type=str)
    if not linecol:
        linecol = "1:1"

    # TODO: make the column optional

    return lambda app, path=path, linecol=linecol: app.goto_location(
        path, linecol.replace(":", ".")
    )


def register(cli: click.Group):
    cli.add_command(goto)
    cli.add_command(open)
