---
title: Playtesting in Studio
description: Run dialogue paths, switch locales, edit state, save checkpoints, and inspect the decision trace.
---

Studio’s playtester uses the current project content to test dialogue branches and game state quickly.

## Start a conversation

Select **Playtest** in the top bar or bottom dock. Then select **Start at node…**, search for a dialogue, and choose the node where testing should begin.

[![Starting a playtest at a specific dialogue node](/images/studio/playtest-toolbar.png)](/images/studio/playtest-toolbar.png)

[![Choosing the dialogue and node where the playtest begins](/images/studio/start-node-picker.png)](/images/studio/start-node-picker.png)

The playback column shows:

- The resolved speaker and line
- Every choice that the engine evaluated
- **AVAILABLE** choices that can be selected
- **HIDDEN** choices with the failed requirement and live value that caused it

Hidden choices show why they are unavailable, including the requirement that failed and its current value.

[![Available and hidden choices in the playtester](/images/studio/playtest-choices.png)](/images/studio/playtest-choices.png)

## Shape the test state

The state inspector provides controls for the current playtest state:

- Toggle flags
- Edit variables
- Remove inventory items
- Set quest stages
- Change character relationships
- Confirm the current location and locale

Changes take effect immediately, so the available choices and displayed text update as they would in the game.

[![Flags, variables, inventory, quests, and relationships in the state inspector](/images/studio/playtest-state.png)](/images/studio/playtest-state.png)

## Save checkpoints

Select **Save test state**, give the state a descriptive name such as `odd_jobs_started`, and save it. The checkpoint stores the full engine state for this project.

[![Naming a saved playtest state](/images/studio/save-test-state.png)](/images/studio/save-test-state.png)

Select a saved checkpoint to restore it later. Checkpoints are useful for recurring scenarios such as a completed quest, a high relationship value, or a particular inventory combination.

## Read the debug trace

Select **Debug trace** to inspect the events produced by the session:

- Node entry
- Condition evaluation
- Filtered choices
- Applied effects
- Dialogue transitions
- Engine errors

Search by an ID or symbol to focus the trace. Use it with the hidden-choice explanations to see why a branch behaved as it did.

[![The debug trace for the active playtest](/images/studio/debug-trace.png)](/images/studio/debug-trace.png)

## Refresh after editing

After Studio reloads edited content, the playtester keeps the current state and position when possible. If the active dialogue node no longer exists, the session restarts with the updated content.

Use **Restart** for a clean run from the game configuration’s starting state.

## Test another language

After you add localization, use the **Locale** selector in the playtest toolbar to run the same conversation in another language. The current story state stays in place while the displayed text changes.

See [Localization in Studio](/studio/localization/) for the setup steps.

See [Variable Naming](/guides/variable-naming/) when deciding which variables should appear in the default game interface and which should remain internal.
