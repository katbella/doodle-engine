---
title: Video & Cutscenes
description: How to add fullscreen video cutscenes to your game.
---

Doodle Engine supports fullscreen video cutscenes triggered from dialogue. Videos play as an overlay and can be skipped by the player.

## Adding a Video

Use the `VIDEO` keyword in a dialogue node:

```
NODE dramatic_reveal
  VIDEO intro_cinematic.mp4
  NARRATOR: @narrator.after_video
```

The video plays fullscreen before the dialogue text is shown.

## How It Works

1. The parser converts `VIDEO filename` into a `playVideo` effect
2. The effect sets `pendingVideo` on the game state
3. The snapshot includes `pendingVideo` as a transient field that appears once and is automatically cleared
4. The renderer picks up `pendingVideo` and shows the `VideoPlayer` component

## Using with GameShell

If you're using `GameShell`, video playback is automatic. Configure the video file location:

```tsx
<GameShell registry={registry} config={config} videoBasePath="/assets/video" />
```

The default `videoBasePath` is `'/video'`.

## Using with a Custom Renderer

For custom renderers, use the `VideoPlayer` component directly:

```tsx
import { VideoPlayer } from "@doodle-engine/react";

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
          basePath="/video"
          onComplete={() => setVideo(null)}
        />
      )}
      {/* rest of your UI */}
    </>
  );
}
```

### VideoPlayer Props

| Prop         | Type         | Default    | Description                          |
| ------------ | ------------ | ---------- | ------------------------------------ |
| `src`        | `string`     | required   | Video file name                      |
| `basePath`   | `string`     | `'/video'` | Base path for video files            |
| `onComplete` | `() => void` | required   | Called when video ends or is skipped |
| `className`  | `string`     | `''`       | CSS class                            |

## Skipping Videos

Players can skip a video using:

- The **Skip** button displayed on the video overlay
- **Escape**, **Space**, or **Enter** keys

## File Organization

Place video files in your assets directory:

```
assets/
  video/
    intro_cinematic.mp4
    chapter2_cutscene.mp4
    ending.mp4
```

## Examples

### Intro cutscene on first visit

```
TRIGGER tavern
REQUIRE notFlag seenIntro

NODE start
  VIDEO intro_cinematic.mp4
  NARRATOR: @narrator.intro
  SET flag seenIntro

  CHOICE @narrator.choice.continue
    END dialogue
  END
```

### Video mid-conversation

```
NODE reveal
  BARTENDER: @bartender.dramatic_line
  VIDEO dramatic_reveal.mp4
  GOTO after_reveal

NODE after_reveal
  BARTENDER: @bartender.after_reveal

  CHOICE @bartender.choice.respond
    GOTO next
  END
```

### Multiple cutscenes in a quest

```
NODE quest_complete
  VIDEO quest_complete_cinematic.mp4
  MERCHANT: @merchant.quest_complete
  SET questStage odd_jobs complete
  ADD variable gold 50
  NOTIFY @notification.quest_complete

  CHOICE @merchant.choice.thanks
    GOTO farewell
  END
```
