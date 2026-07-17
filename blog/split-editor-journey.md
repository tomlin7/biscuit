# The Split Editor Journey: A Tkinter Odyssey

## Introduction

When I set out to implement VSCode-style split editor panes in Biscuit, I thought it would be straightforward: wrap editors in a `PanedWindow`, call `add()` when splitting, call `forget()` when closing. Three days and a dozen dead ends later, I emerged with a deep appreciation for Tk's geometry management, Python 3.12's `Tcl_Obj` changes, and the subtle art of widget reparenting.

This is the story of what went wrong, what I learned, and how the final solution turned out to be simpler than I expected.

## The Goal

Biscuit is a native IDE built with Python and Tkinter. It needed:

- Each editor pane has its own tab bar (like VSCode editor groups)
- Each pane has its own breadcrumbs bar
- Splitting a pane divides it in half, creating a sibling pane
- Recursive nesting: split a split, then split again
- Closing the last tab in a pane auto-closes the pane

---

## Attempt 1: The Naive `PanedWindow` Approach

**What I tried:** Create a single `PanedWindow` as the root, put `EditorPane` widgets in it. On split, `forget()` the current pane, create a sibling, `add()` both back.

```python
# Simplified: flat split
parent_pw.forget(pane)
sibling = EditorPane(parent_pw, self)
parent_pw.add(pane, stretch="always")
parent_pw.add(sibling, stretch="always")
```

**What broke:** First split worked perfectly. Second split created a nested `PanedWindow` — and the new sibling pane showed no tab bar or breadcrumbs. The first pane (reparented into the nested PW) also lost its tab bar on some attempts.

**Why:** When you reparent a widget in Tk via `PanedWindow.add()`, the widget's Tk path changes. All its children get new paths too. Grid geometry data stored under the old paths is effectively lost. The tab bar frame still exists in the Python object, but Tk no longer knows where to render it.

---

## Attempt 2: The Tcl\_Obj Trap

**What I discovered:** On Python 3.12+, `PanedWindow.panes()` no longer returns strings — it returns opaque `_tkinter.Tcl_Obj` objects. Every `isinstance(child, EditorPane)` check silently returns `False`. Every `child is pane` identity check returns `False`.

```python
# Python 3.11: returns ('.!root_pw.!editorpane',)
# Python 3.12: returns (<Tcl_Obj: 'window object'>,)
```

**The fix:** A helper function to convert Tcl_Obj paths to actual widget objects.

```python
def _pw_child(self, pw, path):
    return pw.nametowidget(str(path))
```

Used in every iteration over `panes()` that needs identity or type checks.

---

## Attempt 3: Grid -in and the Unmapped Widget Problem

**What I tried:** I noticed the nested `PanedWindow` was being created but not yet added to the visible widget tree when its children were being populated. I reordered operations so the nested PW was added to its parent *before* creating and populating the sibling pane.

```python
# Before (broken):
sibling = EditorPane(nested, self)
sibling.add_tab(new_editor)          # grids in unmapped widget
nested.add(sibling, ...)
parent_pw.add(nested, ...)

# After (still broken for tab bar):
parent_pw.add(nested, ...)           # mapped first
sibling = EditorPane(nested, self)
sibling.add_tab(new_editor)          # grids in mapped widget
nested.add(sibling, ...)
```

**Why still broken:** The sibling was created as a child of the nested `PanedWindow`, but it wasn't *managed* by the PanedWindow until `nested.add(sibling)` was called. Without PW management, it had 0×0 size. Grid operations queued at 0×0 never recalculated when the PW later gave it proper dimensions.

I tried calling `_update_tab_bar_visibility()` and `set_active_editor()` *after* `nested.add(sibling)` — the grid methods ran, but the rendering was already baked in at 0 size.

---

## Attempt 4: The Sash Trap

**What I tried:** Removing `_equalize_pw(nested)` (which sets explicit sash positions) to let Tk's default PW layout distribute space equally.

**What broke:** The PanedWindow default layout divided space based on requested sizes, but since one child was freshly created with natural content size and the other was reparented with its existing content, the distribution was uneven.

Explicit sash placement via `sash_place` has a subtle bug: when you set a sash at an absolute pixel position, and the PW is *later* resized (because its parent PW gets its sashes adjusted), the sash **stays at the same pixel** — it does not recalculate proportionally. So `_equalize_pw(nested)` set sashes based on a stale width, and when `_equalize_pw(parent_pw)` later resized the nested PW, the stale sash position remained, giving one child zero space.

---

## The Final Solution: Destroy and Recreate

**The breakthrough:** Instead of reparenting the existing pane into a nested PW, I destroy it entirely and create two fresh panes. The editors themselves are separate widgets mastered by `EditorsManager` (not by the pane), so they survive the destruction and can be moved to new panes.

```python
# Save editors from the old pane
saved_editors = [tab.editor for tab in list(pane.active_tabs)]

# Destroy the old pane entirely
pane.clear_tabs()
pane.destroy()

# Create nested PW
nested = PanedWindow(parent_pw, ...)
parent_pw.add(nested, ...)

# Create two fresh EditorPanes
new_pane = EditorPane(nested, self)
sibling = EditorPane(nested, self)

# Move editors to new_pane (creates fresh Tabs)
for editor in saved_editors:
    new_pane.add_tab(editor)

# Create sibling's tab
sibling.add_tab(new_editor)

# Register both with the PW
nested.add(new_pane, stretch="always")
nested.add(sibling, stretch="always")
```

**Why this works:**

1. **No reparenting** — every widget is created with its final parent. Tk paths never change, grid data is never lost.
2. **Fresh tabs** — `add_tab()` creates new `Tab` widgets in the new pane's tab container. Grid operations run in a properly mapped, properly sized container.
3. **Editor widgets survive** — editors are mastered by `EditorsManager`, not by the pane. Destroying the pane leaves them intact.
4. **No stale sashes** — the nested PW uses Tk's default equal-space distribution (no explicit `sash_place`), so it recalculates correctly when resized.

## Key Lessons

1. **Never reparent widgets in Tk** — `PanedWindow.add()` with a different parent changes Tk paths and corrupts grid state. Always destroy and recreate.

2. **Tcl\_Obj in Python 3.12+** — `panes()` returns objects, not strings. Always use `nametowidget(str(path))`.

3. **PanedWindow children must be `add()`-ed to be sized** — a Frame child of a PanedWindow that isn't registered via `add()` has 0×0 size. Grid operations at 0×0 may not recalculate when the child is later registered.

4. **`sash_place` sets absolute positions** — they don't scale when the PW is resized. Avoid explicit sashes for nested PWs when their parent PW may later resize them.

5. **Separate editor lifetime from pane lifetime** — by mastering editors at the `EditorsManager` level (not the pane level), editors survive pane destruction and can be moved freely.

The final implementation is ~30 lines of clean code that handles arbitrary nesting depths, works on first and hundredth split, and renders every tab bar and breadcrumbs correctly.
