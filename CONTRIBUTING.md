<h1 align="center">CONTRIBUTING</h1>

## Biscuit Developer Guide
Welcome to the Contributing Guidelines for Biscuit. Follow these when you are thinking about contributing to Biscuit. We welcome your contributions to Biscuit!

## Quick Reference
Here are the basic steps needed to get set up and contribute a patch.
1. Install and set up [Git](https://git-scm.com/).
2. [**Fork**](https://docs.github.com/en/get-started/quickstart/fork-a-repo) the Biscuit repository to your GitHub account and get the source code using:

```bash
git clone --recursive https://github.com/<your_username>/Biscuit.git
cd Biscuit
```
4. We appreciate using [Visual Studio Code](https://code.visualstudio.com/) for development. Open the project directory in Visual Studio Code or your preferred environment.
5. **Open an issue** report in the [Biscuit issue tracker](https://github.com/billyeatcookies/Biscuit/issues) if the issue has not been reported/proposed yet. Trivial issues (e.g. typo fixes) do not require any issue to be created.

5. Create a new local branch where your work for the issue will go, try to format it `fix-issue-#`, e.g.:
    ```
    git checkout -b fix-issue-12345 master
    ```
    If an issue does not already exist, please [create](https://github.com/billyeatcookies/Biscuit/issues) it. 
6. Once you fixed the issue, try running the application, and check no errors are occuring, if everything is ok, commit with a proper message regarding what has been fixed.
7. Push the branch on your fork on GitHub and create a pull request. Include the issue number with format `Mentioned-Issue: ##` in the pull request description. For example:
    ```
    Mentioned-Issue: #12345, Fix x bug in y module
    ```
8. And you are done!