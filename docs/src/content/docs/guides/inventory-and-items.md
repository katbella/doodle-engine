---
title: Inventory & Items
description: How to define items and manage inventory through dialogue effects.
---

Items are defined in YAML. Place them in the starting inventory, give them to the player through story events, or move them between characters and locations.

## Defining an Item

Create `content/items/old_coin.yaml`:

```yaml
id: old_coin
name: Old Coin
description: A salt-stained coin stamped with an unfamiliar crest.
icon: old_coin_icon.png
image: old_coin.png
location: inventory
stats: {}
```

| Field         | Description                                                        |
| ------------- | ------------------------------------------------------------------ |
| `id`          | Unique identifier                                                  |
| `name`        | Display name                                                        |
| `description` | Full description shown on inspection                               |
| `icon`        | Small image for inventory grid                                     |
| `image`       | Large image for detail/inspection view                             |
| `location`    | Starting location: a location ID, `"inventory"`, or a character ID |
| `stats`       | Stats for game-specific data                                       |

## Adding Items via Dialogue

Items are added to inventory through dialogue effects:

```text
NODE find_coin
  BARTENDER: I found this by the docks. You should take it.
  ADD item old_coin
  NOTIFY Old coin added to inventory.
```

## Removing Items

```text
CHOICE Sell the old coin.
  REQUIRE hasItem old_coin
  REMOVE item old_coin
  ADD variable gold 25
  GOTO trade_complete
END
```

## Moving Items

Move items to specific locations:

```text
# Move to a location
MOVE item sword armory

# Move back to inventory
ADD item sword
```

## Checking for Items

Use `hasItem` to show choices only when the player has an item:

```text
CHOICE Show Elena the old coin.
  REQUIRE hasItem old_coin
  GOTO coin_conversation
END
```

Use `itemAt` to check if an item is at a specific location:

```text
IF itemAt sword armory
  GOTO sword_available
END
```

## Inventory Display

The default `GameRenderer` opens inventory from the bottom bar. It shows a grid of item icons. Selecting an item opens its full image, name, and description.

In a custom renderer, use the `Inventory` component:

```tsx
import { Inventory } from '@doodle-engine/react';

<Inventory items={snapshot.inventory} />;
```

To build a different inventory interface, use `snapshot.inventory`, which contains the items currently available to the player. See [Custom Renderer](/technical/custom-renderer/) for the surrounding setup and [React Components](/reference/react-components/#inventory) for the built-in component.

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
