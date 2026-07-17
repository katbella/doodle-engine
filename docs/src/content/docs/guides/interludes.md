---
title: Narrative Interludes
description: Full-screen text scenes for chapter transitions and dream sequences.
---

Interludes are full-screen narrative scenes for chapter breaks, dreams, and other story transitions. Inspired by the chapter screens in Infinity Engine games such as *Baldur's Gate*, they combine scrolling text with background art and optional audio. Players can read at their own pace or skip when ready.

## Creating an Interlude

Create a YAML file in `content/interludes/`:

```yaml
# content/interludes/chapter_one.yaml
id: chapter_one
background: dusk_road.jpg
text: |
    Chapter One: A New Beginning

    The road behind you stretches long and empty.
    Ahead, the lights of town flicker through the evening mist.

    You have heard the rumours. Strange things happening.
    People going missing. Shadows that move wrong.

    Someone has to look into it.

    It might as well be you.
```

### All Fields

| Field               | Required | Description                                                                          |
| ------------------- | -------- | ------------------------------------------------------------------------------------ |
| `id`                | Yes      | Unique identifier                                                                    |
| `background`        | Yes      | Background image path                                                                |
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

Use a localization key for multi-language support:

```yaml
id: chapter_one
background: dusk_road.jpg
text: '@chapter.one.intro'
```

Then in `content/locales/en.yaml`:

```yaml
chapter.one.intro: |
    Chapter One: A New Beginning

    The road behind you stretches long and empty.
    ...
```

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
