from __future__ import annotations

import typing

import click

from biscuit.git import URL

if typing.TYPE_CHECKING:
    from biscuit import App


@click.command()
@click.argument("url", type=str)
def clone(url) -> typing.Callable[[App, str], None]:
    """Clone & open a git repository in Biscuit

    This command will clone a git repository and open it in a new window.

    Example:
        biscuit clone

    Args:
        url (str): The url of the git repository
    """

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
    """Diff two files

    This command will open a new window with the diff of the two files.

    Example:
        biscuit diff path/to/file path/to/second/file

    Args:
        file1 (str, optional): The path to the first file. Defaults to None.
        file2 (str, optional): The path to the second file. Defaults to None."""

    if not file1:
        file1 = click.prompt("path/to/file", type=str)
    if not file2:
        file2 = click.prompt("path/to/second/file", type=str)

    return lambda app, file1=file1, file2=file2: app.diff_files(file1, file2)


def register(cli: click.Group):
    cli.add_command(clone)
    cli.add_command(diff)
