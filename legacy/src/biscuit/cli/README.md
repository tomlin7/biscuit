## Feature
A CLI application for Biscuit using Python click (suggestions for other CLI libs open). 

### Commands
- `biscuit --help` - Show help for the Biscuit CLI
- `biscuit --version` - Show the version of Biscuit
- `biscuit --dev` - Start Biscuit in development mode
- `biscuit clone [URL]` - Clone a Biscuit repository
- `biscuit diff [FILE1] [FILE2]` - Show the differences between the local and remote Biscuit repositories
- `biscuit goto [PATH] [LINE:COLUMN]` - Open and go to a specific line

### Extension dev commands (not implemented)
- `biscuit extension create` - Create a new extension
- `biscuit extension test` - Test an extension
