# Biscuit Documentation

`docs/` contains the documentation for Biscuit. The documentation is written in Markdown and is rendered using [MkDocs](https://www.mkdocs.org/). Site uses the [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) theme.

## Building the documentation

If you have Poetry installed, you can install the dependencies for the documentation by running:

```bash
poetry install --with docs
```

Then you can serve the documentation locally by running:

```bash
poetry run mkdocs serve
```

Building the documentation can be done by running:

```bash
poetry run mkdocs build
```

The documentation will be built in the `site` directory.

If you don't have Poetry installed, you can install the dependencies by running:

```bash
pip install mkdocs mkdocs-material mkdocstrings-python
```

Then you can serve the documentation locally by running:

```bash
mkdocs serve
```

Building the documentation can be done by running:

```bash
mkdocs build
```

## Contributing

If you want to contribute to the documentation, first check issue [#418](https://github.com/tomlin7/biscuit/issues/418) to see if there are any open issues. You can also create a new issue if you find something that needs to be fixed or added to the documentation.

If you want to add a new page, create a new Markdown file in the `docs` directory and add it to the `nav` section in the `mkdocs.yml` file. If you want to edit an existing page, find the corresponding Markdown file in the `docs` directory and make your changes. Then create a pull request with your changes.

If you want to add a new section to the documentation, create a new directory in the `docs` directory and add a new Markdown file to that directory. Then add the new directory and file to the `nav` section in the `mkdocs.yml` file. If you want to edit an existing section, find the corresponding directory in the `docs` directory and make your changes. Then create a pull request with your changes.
