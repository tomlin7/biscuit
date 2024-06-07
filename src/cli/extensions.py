import click


@click.group()
def extensions(): ...


@extensions.command()
def create():
    click.echo("Extension created!")


@extensions.command()
def test():
    click.echo("Extension tested!")


def setup(cli: click.Group):
    cli.add_command(extensions)
