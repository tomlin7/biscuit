import os
from pathlib import Path

import click
from click.parser import split_opt
from click.utils import make_str

from biscuit import __version__, get_app_instance

from . import editor, extensions, git  # reason: see at bottom


class BiscuitCLI(click.Group):
    path = ""

    def main(self, *args, **kwargs):
        try:
            return super(BiscuitCLI, self).main(*args, **kwargs)
        except Exception:
            path = self.path

            if path:
                path = Path(self.path).resolve()
                path.mkdir(exist_ok=True)

            appdir = Path(__file__).resolve().parent
            app = get_app_instance(appdir, open_path=str(path))
            app.run()

    def resolve_command(self, ctx, args):
        cmd_name = make_str(args[0])
        original_cmd_name = cmd_name

        cmd = self.get_command(ctx, cmd_name)
        if cmd is None and ctx.token_normalize_func is not None:
            cmd_name = ctx.token_normalize_func(cmd_name)
            cmd = self.get_command(ctx, cmd_name)

        if cmd is None and not ctx.resilient_parsing:
            if split_opt(cmd_name)[0]:
                self.parse_args(ctx, ctx.args)

            # ctx.fail(_("No such command {name!r}.").format(name=original_cmd_name))
            self.path = original_cmd_name

        return cmd_name if cmd else None, cmd, args[1:]


@click.group(cls=BiscuitCLI, invoke_without_command=True)
@click.version_option(__version__, "-v", "--version", message="Biscuit v%(version)s")
@click.help_option("-h", "--help")
@click.option("--dev", is_flag=True, help="Run in development mode")
def cli(path=None, dev=False):
    """Biscuit CLI"""

    click.echo(f"Biscuit v{__version__} {'(dev) 🚧' if dev else '🚀'}")


@cli.result_callback()
def process_commands(processors, path=None, dev=False):
    if path:
        path = str(Path(path).resolve())
        click.echo(f"Opening {path}")

    appdir = Path(os.path.abspath(__file__)).parent
    app = get_app_instance(appdir, open_path=path)

    if processors:
        if isinstance(processors, list):
            for processor in processors:
                processor(app)
        else:
            processors(app)

    app.run()


@cli.command("doc")
def docs():
    """Open biscuit documentation

    This command will open the biscuit documentation in the default browser.

    Example:
        biscuit doc
    """

    click.launch("https://tomlin7.github.io/biscuit/")
    exit()


def setup():
    """Setup the CLI commands

    Loads all the commands from the cli extensions and registers them"""

    extensions.register(cli)
    git.register(cli)
    editor.register(cli)


def run():
    """Setup the CLI and run the CLI"""

    setup()
    cli()


if __name__ == "__main__":
    run()
