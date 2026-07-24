---
title: Notifications
description: Show short messages when dialogue effects change the game.
---

Notifications tell the player that something just happened, such as receiving an item, starting a quest, or gaining reputation. Use the `NOTIFY` effect in a dialogue node, choice, or conditional branch.

## Show a Notification

Write the message directly after `NOTIFY`:

```text
NODE find_coin
  NARRATOR: A tarnished coin is wedged between the floorboards.
  ADD item old_coin
  NOTIFY Old coin added to inventory.
  END dialogue
```

The built-in renderer displays the message briefly over the game. A notification does not pause the conversation or require the player to dismiss it.

## Use Notifications with Conditions

Place a notification beside the effects it describes:

```text
IF roll 1 4 4
  ADD item old_coin
  NOTIFY You found an old coin.
END
```

In this example, the item and message appear only when the random check passes.

## Translate a Notification

When the game supports multiple languages, replace the message with a localization key:

```text
NOTIFY @notification.found_coin
```

```yaml
# content/locales/en.yaml
notification.found_coin: Old coin added to inventory.
```

Add the same key to every other locale file with its translated message. See [Localization](/guides/localization/) for the complete setup.

## Custom Renderers

The engine includes new notifications in `snapshot.notifications`, the current list of messages for the renderer. They are transient, meaning they belong to the engine update that produced them rather than permanent game state.

Use the built-in `NotificationArea` component or present the strings in your own interface:

```tsx
<NotificationArea notifications={snapshot.notifications} />
```

See [NotificationArea](/reference/react-components/#notificationarea) for its props.
