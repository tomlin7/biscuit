---
id: project-structure
title: Project Structure
description: Structure of Biscuit codebase
slug: /structure
sidebar_position: 1
---

The codebase of Biscuit is divided into 3 main parts:
- **/biscuit**: Main codebase of the App
- **/tests**: unit tests for Biscuit
- **/docs**: documentation for Biscuit

# /biscuit

- `/config`: configuration files for the app (WIP).
- `/core`: the core codebase of the app.
- `/extensions`: extensions directory.
- `/res`: icon fonts, bitmaps, images, etc.

Main interest here is the `/core` directory. 

- `/core/components`: all components of app such as editors, git, extension manager, views and floating views such as menu, notifications and palette, etc.
- `/core/layout`: the GUI structure, statusbar, menubar, editor-view-terminal managers, etc.
- `/core/utils`: keyboard shortcuts, events manager, etc.
- `/core/settings`: preferences, configuration manager, settings editor, themes, etc.
