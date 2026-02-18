---
title: Inventory & Items
description: How to define items and manage inventory through dialogue effects.
---

Items are defined in YAML and added to the player's inventory through dialogue effects. Since this is a text-based game, items aren't picked up from the ground; they're given through story events.

## Defining an Item

Create `content/items/old_coin.yaml`:

```yaml
id: old_coin
name: '@item.old_coin.name'
description: '@item.old_coin.description'
icon: old_coin_icon.png
image: old_coin.png
location: inventory
stats: {}
```

| Field         | Description                                                        |
| ------------- | ------------------------------------------------------------------ |
| `id`          | Unique identifier                                                  |
| `name`        | Display name (supports `@key` localization)                        |
| `description` | Full description shown on inspection                               |
| `icon`        | Small image for inventory grid                                     |
| `image`       | Large image for detail/inspection view                             |
| `location`    | Starting location: a location ID, `"inventory"`, or a character ID |
| `stats`       | Extensible stats object                                            |

## Adding Items via Dialogue

Items are added to inventory through dialogue effects:

```
NODE find_coin
  BARTENDER: @bartender.found_something
  ADD item old_coin
  NOTIFY @notification.found_coin
```

## Removing Items

```
CHOICE @merchant.choice.trade_coin
  REQUIRE hasItem old_coin
  REMOVE item old_coin
  ADD variable gold 25
  GOTO trade_complete
END
```

## Moving Items

Move items to specific locations:

```
# Move to a location
MOVE item sword armory

# Move back to inventory
ADD item sword
```

## Checking for Items

Use `hasItem` to show choices only when the player has an item:

```
CHOICE @merchant.choice.show_coin
  REQUIRE hasItem old_coin
  GOTO coin_conversation
END
```

Use `itemAt` to check if an item is at a specific location:

```
IF itemAt sword armory
  GOTO sword_available
END
```

## Inventory Display

The default `GameRenderer` shows inventory in the sidebar with a grid of item icons. Players can click an item to inspect it, and a modal shows the full image, name, and description.

In a custom renderer, use the `Inventory` component:

```tsx
import { Inventory } from '@doodle-engine/react';

<Inventory items={snapshot.inventory} />;
```

Or build your own using `snapshot.inventory`, which contains `SnapshotItem` objects:

```typescript
interface SnapshotItem {
    id: string;
    name: string; // Localized
    description: string; // Localized
    icon: string;
    image: string;
    stats: Record<string, unknown>;
}
```
