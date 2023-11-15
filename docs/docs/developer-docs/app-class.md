---
id: app-class
title: The App class
description: core component with access to all the important parts of the app
slug: /base
sidebar_position: 2
---

App class can be considered as the heart of biscuit. Main point of having this class is to have a single point of access to all the important parts of the app. 

> [!IMPORTANT]  
> **This class holds reference to all the components of Biscuit and every class of biscuit have a reference to this `base` class**

- Example: Accessing the active editor instance from Foo class of biscuit: 
    ```py
    class Foo:
        ...
        def foo(self):
            editor = self.base.editorsmanager.active_editor 
            if (editor.content and editor.content.exists):
                print(editor.path)
                if (editor.content.editable):
                    self.base.notifications.info(":)")
    ```

- Example: Accessing the menubar from Foo class of biscuit:
    ```py
    class Foo:
        ...
        def foo(self):
            filemenu = self.base.menubar.file_menu
            filemenu.add_item("this", lambda: print("Wah"))

            xyzmenu = self.base.menubar.add_menu("Wah")
            xyzmenu.add_item("stuff", lambda: print("Wah"))
    ```
