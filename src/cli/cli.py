from pathlib import Path
from typing import Callable

import click

from src import App, __version__, get_app_instance
from src.cli import extensions


@click.group(invoke_without_command=True)
@click.version_option(__version__, "-v", "--version", message="Biscuit v%(version)s")
@click.help_option("-h", "--help")
@click.pass_context
def cli(ctx, path=None):
    """Biscuit CLI"""

    click.echo(f"Biscuit v{__version__}")
    if ctx.invoked_subcommand is None and path:
        click.echo(f"Opening {path}")


@cli.result_callback()
def process_commands(processors, path=None):
    """Process the commands"""

    if path:
        path = str(Path(path).resolve())
    app = get_app_instance(open_path=path)

    if processors:
        if isinstance(processors, list):
            for processor in processors:
                processor(app)
        else:
            processors(app)

    app.run()


@cli.command()
@click.argument("url", type=str)
def clone(url) -> Callable[[App, str], None]:
    """Clone & open a git repository in Biscuit"""

    if not url:
        url = click.prompt("Git repository url", type=str)

    click.echo(f"Cloning repository from {url}")
    return lambda app, url=url: app.clone_repo(url, new_window=False)


@cli.command()
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
def diff(file1=None, file2=None) -> Callable[[App, str], None]:
    """Diff two files"""

    if not file1:
        file1 = click.prompt("path/to/file", type=str)
    if not file2:
        file2 = click.prompt("path/to/second/file", type=str)

    return lambda app, file1=file1, file2=file2: app.diff_files(file1, file2)


def setup():
    extensions.setup(cli)


setup()

if __name__ == "__main__":
    cli()
