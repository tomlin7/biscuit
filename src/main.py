import os


def main(args: list[str] = []):
    """Main entry point for the application.

    Args:
        args (list[str], optional): Command line arguments. Defaults to []."""

    from biscuit import App, check_python_installation

    check_python_installation()

    dir = None
    if not args:
        args = [os.path.dirname(os.path.abspath(__file__))]
    elif len(args) >= 2:
        dir = args[1]

    app = App(args[0] if args else None, dir=dir)
    app.run()


if __name__ == "__main__":
    import sys

    main(sys.argv)
