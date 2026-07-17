---
title: Video & Cutscenes
description: How to add fullscreen video cutscenes to your game.
---

Doodle Engine supports fullscreen video cutscenes triggered from dialogue. Videos play as an overlay and can be skipped by the player.

## Adding a Video

Use the `VIDEO` keyword in a dialogue node:

```text
NODE dramatic_reveal
  VIDEO intro_cinematic.mp4
  NARRATOR: The harbor looks different when the light returns.
```

`GameShell` shows the video as a fullscreen overlay before the player interacts with the dialogue underneath.

## How It Works

1. The dialogue parser converts `VIDEO filename` into a `playVideo` effect.
2. The effect adds `pendingVideo` to the snapshot returned after the dialogue action.
3. The renderer reads `pendingVideo` and opens the `VideoPlayer` component.

`pendingVideo` is transient, which means it appears for one engine update. `GameShell` keeps the filename until playback finishes.

## Using with GameShell

`GameShell` plays the video automatically. The engine resolves its filename to the video asset path.

## Using with a Custom Renderer

For custom renderers, use the `VideoPlayer` component directly:

```tsx
import { VideoPlayer } from '@doodle-engine/react';

function MyGame() {
    const { snapshot } = useGame();
    const [video, setVideo] = useState<string | null>(null);

    useEffect(() => {
        if (snapshot.pendingVideo) {
            setVideo(snapshot.pendingVideo);
        }
    }, [snapshot.pendingVideo]);

    return (
        <>
            {video && (
                <VideoPlayer
                    src={video}
                    onComplete={() => setVideo(null)}
                />
            )}
            {/* rest of your UI */}
        </>
    );
}
```

### VideoPlayer Props

| Prop         | Type         | Default  | Description                          |
| ------------ | ------------ | -------- | ------------------------------------ |
| `src`        | `string`     | required | Resolved video file path             |
| `onComplete` | `() => void` | required | Called when video ends or is skipped |
| `className`  | `string`     | `''`     | CSS class                            |

## Skipping Videos

Players can skip a video using:

- The **Skip** button displayed on the video overlay
- **Escape**, **Space**, or **Enter** keys

## File Organization

Place video files in your assets directory:

```text
assets/
  video/
    intro_cinematic.mp4
    chapter2_cutscene.mp4
    ending.mp4
```

## Examples

### Intro cutscene on first visit

```text
TRIGGER tavern
REQUIRE notFlag seenIntro

NODE start
  VIDEO intro_cinematic.mp4
  NARRATOR: The ship reaches the harbor at dawn.
  SET flag seenIntro

  CHOICE Step onto the dock.
    END dialogue
  END
```

### Video mid-conversation

```text
NODE reveal
  BARTENDER: There is something you need to see.
  VIDEO dramatic_reveal.mp4
  GOTO after_reveal

NODE after_reveal
  BARTENDER: Now you understand why the town is afraid.

  CHOICE Ask what happens next.
    GOTO next
  END
```

### Multiple cutscenes in a quest

```text
NODE quest_complete
  VIDEO quest_complete_cinematic.mp4
  MERCHANT: The delivery arrived safely. Here is your payment.
  SET questStage odd_jobs complete
  ADD variable gold 50
  NOTIFY Quest complete: Odd Jobs

  CHOICE Thank Elena.
    GOTO farewell
  END
```
