import click


@click.group("ext")
def extension():
    """Extension development commands"""
    ...


@extension.command()
def create():
    click.echo("Extension created!")


@extension.command()
def test():
    click.echo("Extension tested!")


def register(cli: click.Group):
    cli.add_command(extension)
