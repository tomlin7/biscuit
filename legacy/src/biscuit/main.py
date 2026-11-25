import os

from .app import App
from .common import check_python_installation


def get_app_instance(
    exec_dir: str = os.path.abspath(__file__),
    open_path: str = None,
) -> App:
    """Get an instance of the application.

    Args:
        exec_dir (str, optional): The directory of the executable. Defaults to os.path.dirname(os.path.abspath(__file__)).
        open_path (str, optional): The path to open. Defaults to None.

    Returns:
        App: An instance of the application."""

    check_python_installation()
    return App(exec_dir, dir=open_path)


def main(args: list[str] = []):
    """Main entry point for the application.

    Args:
        args (list[str], optional): Command line arguments. Defaults to []."""

    dir = None
    if not args:
        args = [os.path.abspath(__file__)]
    elif len(args) >= 2:
        dir = args[1]

    app = get_app_instance(args[0], dir)
    app.run()


def start_app():
    """Start the application."""

    import sys

    main(sys.argv)


if __name__ == "__main__":
    start_app()
