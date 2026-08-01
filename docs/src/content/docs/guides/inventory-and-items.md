---
title: Inventory & Items
description: How to define items and manage inventory through dialogue effects.
---

Items are defined in YAML. Place them in the starting inventory, give them to the player through story events, or move them between characters and locations. This guide covers the item file, the effects that move items around, and the conditions that check for them. In Doodle Studio, items are edited under **Items** in the project rail.

## Defining an Item

Each item is one YAML file in `content/items/`. The starter project ships this one as `content/items/old_coin.yaml`:

```yaml
id: old_coin
name: "Old Coin"
description: "A tarnished coin with strange markings. It doesn't match any currency you've seen before."
icon: ""
image: ""
location: tavern
stats: {}
```

The starter coin begins at the tavern and is handed to the player during dialogue. An item that should already be in the player's pockets uses `location: inventory` instead, and `icon` and `image` name files in `assets/images/items/` when the item has artwork.

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

:::note
`REMOVE item` takes the item out of the game entirely, not just out of the inventory. Afterward, `hasItem` and `itemAt` are both false for it. To put an item somewhere instead, use `MOVE item`.
:::

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

## Check Your Work

Run `npm run validate`, or select **Validate** in Studio. It confirms each item's `location` is `inventory`, an existing location, or an existing character, and that every `ADD`, `REMOVE`, `MOVE`, and `hasItem` names a real item. Then earn the item in play and open the Inventory panel to see its name and description; Studio's [Playtest](/studio/playtesting/) can add and remove items directly when you want to test a branch without earning them first.

Items usually gate story with `hasItem`, so [Writing Dialogues](/guides/writing-dialogues/) covers where those checks go. To give items artwork, see [Assets & Media](/guides/assets-and-media/).
