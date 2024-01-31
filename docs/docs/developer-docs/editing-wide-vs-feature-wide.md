---
id: editing-wide-vs-feature-wide
title: Editing-wide vs Feature-wide
description: relations between modules
slug: /editing-wide-vs-feature-wide
sidebar_position: 0
---

There many classes defined in biscuit sources code base. For some classes, their defined as _**editing-wide**_ for their may be access, invoking, messageing in many difference context. Some classes defined as _**feature-wide**_, if their are mostly about some ranged graphic area or editing feature, and may be access, invoking, messageing in some context. Normally, a feature-wide class is a visual area or part of facilities about a editing feature. For biscuit heavily focuses on a modern and graphical Human-Computer-Interaction, most classes defined as feature-wide.

Here are some _**editing-wide**_ you may want to know first:

* core.\_\_init\_\_.App
* core.events.EventManager
* core.events.ConfigManager
* core.utils.binder

Here are some _**feature-wide**_ you may want to know first:

* core.gui.GUIManager -- for overall visual area facilities
* core.components.views.sidebar.* -- for visual area in sidebar
* core.components.* -- for visual area
* core.components.floating.* -- for floating visual area
* core.layout.\_\_init\_\_.Root -- container for all visual area
* core.layout.* -- container for visual area

TODO: An introduce for all class and how to develop a new feature
