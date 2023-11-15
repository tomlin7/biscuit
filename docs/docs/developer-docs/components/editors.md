---
id: editors
title: Editors
description: Various kinds of editors such as text, diff, markdown, image, etc.
slug: /editors
sidebar_position: 2
---


## Editor Component

The Editor component is basically an editor picker that picks the right editor for the file type. It also holds the Breadcrumbs with the editor type picked. The Breadcrumbs widget supports accessing any of the editors in clicked directory through PathView widget.

Picks the right editor based on the path, path2, diff values passed. Supports showing diff, images, text files. If nothing is passed, empty text editor is opened.

## Text Editor

The main editor component used to edit most of the text file types. Supports syntax highlighting, completions, find-replace, line numbers, and many more essential features.  