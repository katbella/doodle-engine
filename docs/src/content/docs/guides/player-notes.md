---
title: Player Notes
description: The in-game notebook players use to record their own findings.
---

Players can keep their own notes while they play. The built-in renderer has a **Notes** panel in the bottom bar, beside the Journal. The player gives a note a title and some text, and the note joins a list they can read or delete from later.

Notes are the player's own writing. You do not create them, and there is no file for them in `content/`.

## What a note holds

| Field   | Description                                        |
| ------- | -------------------------------------------------- |
| `id`    | Generated when the note is written                 |
| `title` | The player's title for the note                    |
| `text`  | The note body                                      |

A note needs a title or some text, but not both. Notes stay in the order they were written.

Notes live in game state, so they are written into a save and come back when the player loads it. They are not translated, because the player wrote them.

## Notes and the Journal

The Journal holds what the game records: quest stages and journal entries you write in `content/journal/`. Notes hold what the player records. Both appear in the bottom bar, and neither one changes the other.

## In a custom renderer

The snapshot carries the notes, and two actions change them:

```tsx
import { PlayerNotes } from '@doodle-engine/react';

const { snapshot, actions } = useGame();

<PlayerNotes
    notes={snapshot.playerNotes}
    onWrite={actions.writeNote}
    onDelete={actions.deleteNote}
/>;
```

See [PlayerNotes](/reference/react-components/#playernotes) for its props, and [writeNote](/reference/engine-api/#writenote) and [deleteNote](/reference/engine-api/#deletenote) for the engine methods behind those actions.

## Change the labels

The panel's text comes from `ui.*` keys: `ui.notes`, `ui.add_note`, `ui.note_title`, `ui.note_text`, `ui.no_notes`, and `ui.delete`. Add them to a locale file to translate or reword them. See [UI Strings](/reference/ui-strings/).
