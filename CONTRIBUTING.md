<h1 align="center">CONTRIBUTING</h1>

## Biscuit Developer Guide
Welcome to the Contributing Guidelines for Biscuit. Your contributions and support are greatly appreciated! 🧡
> **Note**
> You will need [Git](https://git-scm.com/) installed to follow the steps below!

## Fixing an issue/adding a feature
Here are the basic steps needed to get set up and contribute a patch.

1. [**Fork**](https://docs.github.com/en/get-started/quickstart/fork-a-repo) the Biscuit repository to your GitHub account and get the source code using:

```bash
git clone https://github.com/<your_username>/Biscuit.git
cd Biscuit
```
2. We appreciate using a [**Release of Biscuit**](https://github.com/billyeatcookies/Biscuit/releases) itself for development, but you can use your preferred editor. Open the project directory in your preferred environment.
3. **Open an issue** report in the [issue tracker](https://github.com/billyeatcookies/Biscuit/issues) if the issue has not been reported/proposed yet. 

4. Switch to a new local branch where your work for the issue will go (format it `fix-#` or `feat-#` if you are having trouble naming)
    ```
    git checkout -b fix-123 main
    ```
5. Once you fixed the issue, try running the application, and check no errors are occuring, if everything is ok, commit with a proper message regarding what has been fixed.
6. You can run the changelog command as following (not mandatory, requires `pip install git-changelog`):
    ```
    git-changelog -o CHANGELOG.md
    ```
    This will update the changelog, and now commit the changes.
7. Push the branch on your fork on GitHub and create a pull request. Include `fix: #` in the description
    ```
    fix: #123, Fix x bug in y module
    ```
