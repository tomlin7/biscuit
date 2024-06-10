import click


@click.group("ext")
def extension():
    """Extension development commands"""
    ...


@extension.command()
def install():
    """Install an extension"""

    click.echo("Extension installed!")


@extension.command()
def uninstall():
    """Uninstall an extension"""

    click.echo("Extension uninstalled!")


@extension.command()
def create():
    """Create a new extension from template"""

    click.echo("Extension created!")


@extension.command()
def test():
    """Test the extension"""

    click.echo("Extension tested!")


def register(cli: click.Group):
    cli.add_command(extension)
