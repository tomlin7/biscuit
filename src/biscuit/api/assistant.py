from .endpoint import Endpoint


class Assistant(Endpoint):
    """Assistant endpoint

    This class is used to interact with the assistant API.
    """

    def __init__(self, *a) -> None:
        super().__init__(*a)
        self.ai = self.base.ai

        self.register_provider = self.ai.register_provider
