---
title: Narrative Interludes
description: Full-screen text scenes for chapter transitions and dream sequences.
---

Interludes are full-screen text scenes — chapter cards, dream sequences, journal entries read aloud — like the parchment screens between chapters in Baldur's Gate. They show a background image with scrolling narrative text. The player can read at their own pace and skip when ready.

## Creating an Interlude

Create a YAML file in `content/interludes/`:

```yaml
# content/interludes/chapter_one.yaml
id: chapter_one
background: /assets/images/banners/dusk_road.jpg
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

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique identifier |
| `background` | Yes | Background image path |
| `text` | Yes | The narrative text (plain text or `@localization.key`) |
| `banner` | No | Optional decorative frame/border image overlaid on the background |
| `music` | No | Music track to play during the interlude |
| `voice` | No | Narration audio file |
| `sounds` | No | Array of ambient sound filenames |
| `scroll` | No | Whether text auto-scrolls upward (default: `true`) |
| `scrollSpeed` | No | Auto-scroll speed in elisas per second (default: `30`) |
| `triggerLocation` | No | Location ID where this auto-triggers on enter |
| `triggerConditions` | No | Conditions that must pass for auto-trigger |
| `effects` | No | Effects applied when the interlude triggers (typically `setFlag` to prevent repeats) |

## Showing an Interlude

### Via Dialogue Effect

Use `INTERLUDE <id>` in any dialogue node:

```
NODE find_letter
  NARRATOR: You open the envelope with trembling hands.
  SET flag foundLetter
  INTERLUDE discovery_scene
  END dialogue
```

### Auto-trigger on Location Enter

Set `triggerLocation`, `triggerConditions`, and `effects` in the YAML. The `effects` field runs immediately when the interlude triggers — use it to set a "seen" flag so the interlude doesn't repeat on return visits:

```yaml
id: chapter_two
background: /assets/images/banners/forest.jpg
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

The effects run at trigger time (before the player even sees the interlude), so `notFlag seenChapterTwo` will fail if the player returns — the interlude won't show again.

**Important:** do NOT set the "seen" flag in a dialogue node that fires before the interlude check. The engine evaluates `triggerConditions` first, then applies `effects`. Setting the flag in a dialogue would mark the interlude as seen before the check runs, causing it to never trigger.

## Player Controls

| Action | Effect |
|---|---|
| **Click anywhere** | Skip (dismiss) |
| **Skip >> button** | Dismiss |
| **Space or Enter** | Dismiss |
| **Escape** | Dismiss |
| **Mouse wheel** | Manual scroll (pauses auto-scroll) |
| **↑ / ↓ arrow keys** | Manual scroll (pauses auto-scroll) |

## Localized Text

Use a localization key for multi-language support:

```yaml
id: chapter_one
background: /assets/images/banners/dusk_road.jpg
text: "@chapter.one.intro"
```

Then in `content/locales/en.yaml`:

```yaml
chapter.one.intro: |
  Chapter One: A New Beginning

  The road behind you stretches long and empty.
  ...
```

## Custom Renderer

If you're building a custom renderer (not using `GameShell`), render the interlude yourself:

```tsx
import { Interlude } from '@doodle-engine/react'

function MyRenderer() {
  const { snapshot, actions } = useGame()

  if (snapshot.pendingInterlude) {
    return (
      <Interlude
        interlude={snapshot.pendingInterlude}
        onDismiss={actions.dismissInterlude}
      />
    )
  }

  return <div>...</div>
}
```

`snapshot.pendingInterlude` is `null` when no interlude is pending. The `GameRenderer` and `GameShell` handle this automatically.
