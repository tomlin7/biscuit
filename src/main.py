import os

from biscuit import App, check_python_installation


def get_app_instance(args: list[str] = []) -> App:
    """Get an instance of the application.

    Returns:
        App: An instance of the application."""

    check_python_installation()

    dir = None
    if not args:
        args = [os.path.dirname(os.path.abspath(__file__))]
    elif len(args) >= 2:
        dir = args[1]

    return App(args[0] if args else None, dir=dir)


def main(args: list[str] = []):
    """Main entry point for the application.

    Args:
        args (list[str], optional): Command line arguments. Defaults to []."""

    app = get_app_instance(args)
    app.run()


def start_app():
    """Start the application."""

    import sys

    main(sys.argv)


if __name__ == "__main__":
    start_app()
