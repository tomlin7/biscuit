# The Extension API
The Biscuit extension API allows you to extend the functionality of Biscuit by adding new commands, completions, and more.

## Commands
Commands are the primary way to extend Biscuit. They allow you to add new functionality to Biscuit by defining a new command that can be run from the command palette or from the terminal.

### Creating a Command
To create a new command, you need to use the `biscuit.commands.registerCommand` function. This function takes two arguments: the name of the command and a function callback that will be called when the command is run:

```py
class Extension:
    def __init__(self, api):
        self.api = api

        self.api.commands.registerCommand('example command', self.example_command)
    
    def example_command(self, *_):
        self.api.notifications.info('Hello, world!')
```

In this example, we define a new command called `example command` that displays a notification when run.

## Logging
The Biscuit extension API provides a logging API that allows you to log messages to the Biscuit output panel.

### Logging a Message
To log a message, you can use the `biscuit.logger.info`, `biscuit.logger.error`, `biscuit.logger.warning`, `biscuit.logger.trace`  methods. This function takes a message and an optional log level:

```py
class Extension:
    def __init__(self, api):
        self.api = api

    def run(self):
        self.api.logger.trace('This is a trace message!')
        self.api.logger.info('Hello, world!')
        self.api.logger.warning('This is a warning!')
        self.api.logger.error('An error occurred!')
```

In this example, we log a trace message, an info message, a warning message, and an error message.

## Notifications
The Biscuit extension API provides a notifications API that allows you to display notifications to the user.

### Displaying a Notification
To display a notification, you can use the `biscuit.notifications.info`, `biscuit.notifications.error`, `biscuit.notifications.warning`, `biscuit.notifications.info` methods. This function takes a message and an optional title:

```py
class Extension:
    def __init__(self, api):
        self.api = api

    def run(self):
        self.api.notifications.info('Hello, world!')
        self.api.notifications.warning('This is a warning!')
        self.api.notifications.error('An error occurred!')
        self.api.notifications.info('Info!')
```

In this example, we display an info notification, a warning notification, an error notification, and a success notification.

#TODO document full API
