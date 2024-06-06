from typing import Callable, List, Tuple


class ActionSet(list):
    """Action Set
    Actions are represented by tuples of the form (command: str, callback: Callable).
    Action sets are used to group actions together and display them in the palette.

    The pinned actions are displayed at the top of the palette, their command can be a format string,
    the palette will format the command with the search term.
    eg: pinned=[["Search on Google: {}", foo_method],]
    """

    def __init__(
        self,
        description: str,
        prefix: str,
        items: List[Tuple[str, Callable]] = [],
        pinned: List[Tuple[str, Callable[[str], None]]] = [],
        *args,
        **kwargs
    ) -> None:
        """Initializes the actionset.

        Args:
            description (str): The description of the actionset.
            prefix (str): The prefix of the actionset.
            items (List[Tuple[str, Callable]], optional): The list of actions. Defaults to [].
            pinned (List[Tuple[str, Callable[[str], None]]], optional): The list of pinned actions. Defaults to [].
        """

        super().__init__(items, *args, **kwargs)
        self.description: str = description
        self.prefix: str = prefix

        self.pinned: List[Tuple[str, Callable[[str], None]]] = (
            pinned  # [[command, callback], ...]
        )

    def __repr__(self) -> str:
        return self.description

    def update(self, items: Tuple[str, Callable]) -> None:
        """Update the actionset with new items.

        Args:
            items (Tuple[str, Callable]): The new items to be added."""

        self.clear()
        self += items

    def add_action(self, command: str, callback: Callable) -> None:
        """Add an item to the actionset.

        Args:
            command (str): The command to be displayed.
            callback (Callable): The callback function to be called."""

        self.append((command, callback))

    def add_pinned_actions(self, command: str, callback: Callable) -> None:
        """Add an item to the pinned actions.
        The command can be a format string, the palette will format the command with the search term.

        Args:
            command (str): The command to be displayed.
            callback (Callable): The callback function to be called."""

        self.pinned.append((command, callback))

    def get_pinned(self, term) -> list:
        """Not to be called directly. Returns the pinned actions with the search term formatted."""

        return [[item[0].format(term or "...")] + item[1:] for item in self.pinned]
