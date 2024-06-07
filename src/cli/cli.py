import click

from src import __version__
from src.cli import extensions
from src.main import start_app


@click.group(invoke_without_command=True)
@click.version_option(__version__, "-v", "--version", message="Biscuit v%(version)s")
@click.help_option("-h", "--help")
@click.argument(
    "path",
    default=None,
    type=click.Path(
        exists=True, file_okay=True, dir_okay=True, resolve_path=True, allow_dash=True
    ),
    required=False,
)
def cli(path):
    """Biscuit CLI"""

    click.echo(f"Biscuit v{__version__}")
    if path:
        click.echo(f"Opening {path}")


@cli.command()
@click.argument("link", type=str)
def repo(link):
    """Clone & open a git repository in Biscuit"""

    if not link:
        link = click.prompt("Enter the git repository link", type=str)

    click.echo(f"Cloning repository from {link}")


def setup():
    extensions.setup(cli)


setup()

if __name__ == "__main__":
    cli()
