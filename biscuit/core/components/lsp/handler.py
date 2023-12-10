import sansio_lsp_client as lsp


class EventHandler:
    def __init__(self, master):
        self.master = master
        self.client = master.client
        self.base = master.base

    def process(self, event: lsp.Event) -> None:
        print(event.__class__.__name__.upper(), event)
        if isinstance(event, lsp.LogMessage):
            print(event.message)
            return
        ...