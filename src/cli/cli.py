from pathlib import Path

import click

from src import __version__, get_app_instance
from src.cli import editor, extensions, git


@click.group(invoke_without_command=True)
@click.version_option(__version__, "-v", "--version", message="Biscuit v%(version)s")
@click.help_option("-h", "--help")
@click.option("--dev", is_flag=True, help="Run in development mode")
def cli(path=None, dev=False):
    """Biscuit CLI"""

    click.echo(f"Biscuit v{__version__} {'(dev) 🚧' if dev else '🚀'}")


@cli.result_callback()
def process_commands(processors, path=None, dev=False):
    """Process the commands"""

    if path:
        path = str(Path(path).resolve())
        click.echo(f"Opening {path}")

    app = get_app_instance(open_path=path)

    if processors:
        if isinstance(processors, list):
            for processor in processors:
                processor(app)
        else:
            processors(app)

    app.run()


def setup():
    """Setup the CLI commands"""

    extensions.register(cli)
    git.register(cli)
    editor.register(cli)


def run():
    """Run the CLI"""

    setup()
    cli()


if __name__ == "__main__":
    run()
