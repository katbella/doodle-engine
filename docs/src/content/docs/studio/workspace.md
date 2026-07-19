---
title: The Studio Workspace
description: Navigate the project rail, visual and source editors, references, and bottom dock.
---

The workspace keeps project navigation on the left, editing in the center, context on the right, and project-wide tools in the bottom dock.

## Project rail

The project rail organizes your game into Dialogues, Characters, Locations, Items, Quests, Maps, Interludes, Journal entries, Locales, and Game Config. Select an item to work on it, or use the **+** beside a section to create one. Hover over an item or reach it with the keyboard to show its **Rename** and **Delete** buttons. Renaming also updates known references to that ID; deleting asks for confirmation.

[![The project rail with the starter content](/images/studio/project-rail.png)](/images/studio/project-rail.png)

## Visual editor

The visual editor provides the fields and controls for the selected type of game content.

Enter the words the player should see directly into text fields.

[![A location open in the visual editor](/images/studio/location-editor.png)](/images/studio/location-editor.png)

Studio autosaves visual edits after you stop typing. A dot in the tab means the latest edit has not been saved yet. Press `Ctrl+S` on Windows or `Cmd+S` on macOS to save immediately.

## Source editor

Select **Source** to edit the game file directly. This view is helpful after you are comfortable with Doodle’s YAML and dialogue syntax or when you want to adapt an example from a guide.

Studio preserves unsaved source text if the app closes unexpectedly. If a source file changes outside Studio while it has unsaved edits, choose **Reload** to use the file from disk or **Overwrite** to keep the version in Studio. Visual editors also refuse to overwrite an external change until you confirm it.

## References and validation

The right panel helps you understand how the selected item connects to the rest of the game:

- **References** lists every known place where that ID is used. Select a reference to open its file.
- **Validation** lists problems for the active file.

The **Problems** tab in the bottom dock lists issues across the project. Selecting a problem opens the relevant content.

[![References and validation for the selected location](/images/studio/references-panel.png)](/images/studio/references-panel.png)

## Flags and variables

The **Flags & vars** dock lists the flags and variables used throughout dialogue, along with the number of references to each one. Use **Rename** to update a flag or variable everywhere Studio recognizes it.
