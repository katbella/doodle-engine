---
title: Narrative Interludes
description: Full-screen text scenes for chapter transitions and dream sequences.
---

Interludes are full-screen narrative scenes for chapter breaks, dreams, and
other story transitions. They show scrolling text with optional background art
and audio. Players can read at their own pace or skip when ready.

This guide covers the interlude file and the two ways to show one: from a
dialogue effect, or automatically when the player enters a location. In Doodle Studio,
interludes are edited under **Interludes** in the project rail.

## Creating an Interlude

Create a YAML file in `content/interludes/`. The starter project ships one, `content/interludes/chapter_one.yaml`. Its text lives in the locale file under the key `interlude.chapter_one.text`:

```yaml
id: chapter_one
text: "@interlude.chapter_one.text"
triggerLocation: tavern
triggerConditions:
    - type: notFlag
      flag: seenChapterOne
effects:
    - type: setFlag
      flag: seenChapterOne
```

The locale entry holds the narrative text with its paragraph breaks:

```yaml
# content/locales/en.yaml
interlude.chapter_one.text: |
    Chapter One: A New Beginning

    The road behind you stretches long and empty.
    Ahead, the lights of town flicker through the evening mist.

    You have heard the rumors. Strange things happening.
    People going missing. Shadows that move wrong.

    Someone has to look into it.

    It might as well be you.
```

Text can also be written directly in the interlude file using the same `text: |` block form.

### All Fields

| Field               | Required | Description                                                                          |
| ------------------- | -------- | ------------------------------------------------------------------------------------ |
| `id`                | Yes      | Unique identifier                                                                    |
| `background`        | No       | Optional background image path                                                       |
| `text`              | Yes      | The narrative text (plain text or `@localization.key`)                               |
| `banner`            | No       | Optional decorative frame/border image overlaid on the background                    |
| `music`             | No       | Music track to play during the interlude                                             |
| `voice`             | No       | Narration audio file                                                                 |
| `sounds`            | No       | Array of ambient sound filenames                                                     |
| `scroll`            | No       | Whether text auto-scrolls upward (default: `true`)                                   |
| `scrollSpeed`       | No       | Auto-scroll speed in pixels per second (default: `30`)                               |
| `triggerLocation`   | No       | Location ID where this auto-triggers on enter                                        |
| `triggerConditions` | No       | Conditions that must pass for auto-trigger                                           |
| `effects`           | No       | Effects applied when the interlude triggers (typically `setFlag` to prevent repeats) |

## Showing an Interlude

### Via Dialogue Effect

Use `INTERLUDE <id>` in any dialogue node:

```text
NODE find_letter
  NARRATOR: You open the envelope with trembling hands.
  SET flag foundLetter
  INTERLUDE discovery_scene
  END dialogue
```

### Start When the Player Enters a Location

Set `triggerLocation`, `triggerConditions`, and `effects` in the YAML. The `effects` field runs as soon as the interlude starts. Set a "seen" flag to limit the interlude to the first visit:

```yaml
id: chapter_two
background: forest.jpg
text: |
    Chapter Two: Into the Woods

    The forest is older than the town.
    Older than the people who named it.

triggerLocation: dark_forest
triggerConditions:
    - type: hasFlag
      flag: leftTavern
    - type: notFlag
      flag: seenChapterTwo
effects:
    - type: setFlag
      flag: seenChapterTwo
```

The engine checks `triggerConditions` and then runs the interlude's `effects`. Keeping the `notFlag` condition and matching `setFlag` effect together makes the interlude appear once.

## Audio

The `Interlude` component plays the configured audio when the interlude appears:

- **Music** loops for the full duration and stops when the interlude closes.
- **Voice** plays once as narration and stops when the interlude closes if it is still playing.
- **Sounds** loop as ambient audio and stop when the interlude closes.

Volumes follow the player's current settings. All audio stops when the player skips.

## Player Controls

| Action               | Effect                             |
| -------------------- | ---------------------------------- |
| **Click background** | Skip (dismiss)                     |
| **Skip >> button**   | Dismiss                            |
| **Space or Enter**   | Dismiss                            |
| **Escape**           | Dismiss                            |
| **Mouse wheel**      | Manual scroll (pauses auto-scroll) |
| **Up or Down arrow key** | Manual scroll (pauses auto-scroll) |

## Localized Text

The starter's `chapter_one` interlude already keeps its text behind a localization key, as shown in [Creating an Interlude](#creating-an-interlude). For multi-language support, add the same key with translated text to each additional locale file. Interludes written with direct `text: |` blocks need to move that text into a key before they can be translated. See [Localization](/guides/localization/).

## Custom Renderer

[Custom renderers](/technical/custom-renderer/) can display the pending interlude with the `Interlude` component:

```tsx
import { Interlude } from '@doodle-engine/react';

function MyRenderer() {
    const { snapshot, actions } = useGame();

    if (snapshot.pendingInterlude) {
        return (
            <Interlude
                interlude={snapshot.pendingInterlude}
                onDismiss={actions.dismissInterlude}
            />
        );
    }

    return <div>...</div>;
}
```

`snapshot.pendingInterlude` is `null` when no interlude is pending. The `GameRenderer` and `GameShell` handle this automatically.

## Check Your Work

Run `npm run validate`, or select **Validate** in Studio. It confirms the interlude's trigger location, conditions, effects, and any `INTERLUDE` references resolve. Then reach the interlude in play: enter its trigger location, or take the dialogue path that shows it. The scene should appear full-screen, scroll at reading pace, skip on Escape, and, if you paired `notFlag` with `setFlag`, not appear on a second visit.

Interludes pair naturally with music and narration; [Audio](/guides/audio/) covers preparing those files.
