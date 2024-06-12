from __future__ import annotations

import typing

import click

from src.biscuit.git import URL

if typing.TYPE_CHECKING:
    from src import App


@click.command()
@click.argument("url", type=str)
def clone(url) -> typing.Callable[[App, str], None]:
    """Clone & open a git repository in Biscuit"""

    if not url:
        url = click.prompt("Git repository url", type=str)

    click.echo(
        f"Cloning repository from {'https://github.com/' if not URL.match(url) else ''}{url}"
    )
    return lambda app, url=url: app.clone_repo(url, new_window=False)


@click.command()
@click.argument(
    "file1",
    type=click.Path(
        exists=True,
        dir_okay=False,
        resolve_path=True,
    ),
    required=False,
)
@click.argument(
    "file2",
    type=click.Path(
        exists=True,
        dir_okay=False,
        resolve_path=True,
    ),
    required=False,
)
def diff(file1=None, file2=None) -> typing.Callable[[App, str], None]:
    """Diff two files"""

    if not file1:
        file1 = click.prompt("path/to/file", type=str)
    if not file2:
        file2 = click.prompt("path/to/second/file", type=str)

    return lambda app, file1=file1, file2=file2: app.diff_files(file1, file2)


def register(cli: click.Group):
    cli.add_command(clone)
    cli.add_command(diff)
