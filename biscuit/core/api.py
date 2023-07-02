class ExtensionsAPI:
    def __init__(self, base):
        self.base = base

    def do_something(self):
        self.base.logger.info("Hello world!")
