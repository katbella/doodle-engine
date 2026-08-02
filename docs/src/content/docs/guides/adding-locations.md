---
title: Adding Locations
description: How to create locations and connect them with maps.
---

Locations are the places in your game world. Players travel between them using the map. This guide covers defining a location, connecting locations with a map, narrating first visits, and moving the player and characters around, all by editing project files. In Doodle Studio, the same fields appear in the visual editor when you select a location in the project rail.

## Defining a Location

Each location is one YAML file in `content/locations/`. The starter project ships two, `tavern.yaml` and `market.yaml`. This is `content/locations/tavern.yaml`:

```yaml
id: tavern
name: "The Salty Dog"
description: "A dimly lit tavern smelling of salt and stale ale. Candles flicker on rough wooden tables, and the murmur of conversation fills the air."
banner: ""
music: ""
ambient: ""
```

The `banner`, `music`, and `ambient` fields name files in the project's `assets/` folders. The starter locations leave them empty, and you can too while you write. To add a new location, create another YAML file in the same folder with its own `id`.

| Field         | Description                                                       |
| ------------- | ----------------------------------------------------------------- |
| `id`          | Unique identifier, used in dialogue effects and map references    |
| `name`        | Display name                                                      |
| `description` | Text shown when the player is at this location                    |
| `banner`      | Image associated with the location                                |
| `music`       | Background music track                                             |
| `ambient`     | Ambient sound loop                                                 |

## Creating a Map

Maps connect locations and let players travel between them. The starter project's `content/maps/town.yaml` connects its two locations:

```yaml
id: town
name: "Town"
image: ""
scale: 100
locations:
    - id: tavern
      x: 100
      y: 200
    - id: market
      x: 300
      y: 150
```

To add your new location to the map, append it to `locations` with its own coordinates. To give the map a background, place an image in `assets/images/maps/` and set `image` to its filename, such as `image: town_map.png`.

| Field       | Description                                                     |
| ----------- | --------------------------------------------------------------- |
| `id`        | Unique map identifier                                           |
| `name`      | Display name                                                    |
| `image`     | Background image for the map                                    |
| `scale`     | Pixels per hour of travel (higher = faster travel)              |
| `locations` | Array of location markers with x/y coordinates on the map image |

The `x` and `y` coordinates position clickable markers on the map image. Players click a marker to travel.

The engine shows the map that contains the player's current location. A game can have multiple maps, but each playable location should appear on only one map so the engine can choose the current map unambiguously. Map travel is movement between markers on the currently shown map.

### Map Scale

The `scale` field controls travel time. It represents **pixels per hour** of travel.

To calculate your scale: divide your map's width in pixels by how many hours you want it to take to cross the entire map.

**Example**: For a 500-pixel-wide map that takes 5 hours to cross, use `scale: 100`.

**Formula**: `travel time in hours = round(distance in pixels / scale)`

:::note
Travel always takes at least 1 hour, regardless of scale. Two markers placed close together still cost the player an hour of game time.
:::

## Location Intro Dialogues

Use triggered dialogues to narrate a location's first visit, the way the starter project's `content/dialogues/tavern_intro.dlg` does:

```text
TRIGGER tavern
REQUIRE notFlag seenTavernIntro

NODE start
  NARRATOR: The tavern falls quiet as you enter.
  SET flag seenTavernIntro

  CHOICE Look around.
    END dialogue
  END
```

The `TRIGGER` keyword starts this dialogue when the player enters the tavern. The `REQUIRE notFlag` condition limits it to the first visit.

## Travel Effects

When a player travels with the map:

1. `currentLocation` updates to the new location
2. Time advances by `round(distance / scale)` hours, minimum 1
3. Party members move to the new location
4. Any active dialogue ends
5. Triggered dialogues and interludes at the new location are checked

You can also move the player from dialogue:

```text
CHOICE Follow her to the market.
  GOTO location market
END
```

`GOTO location` changes the current location and ends the dialogue. Use it for scripted movement and scene changes. Map travel also calculates travel time and runs location triggers.

## Enabling/Disabling the Map

The map can be toggled with the `SET mapEnabled` effect:

```text
# Disable map during a dialogue sequence
SET mapEnabled false

# Re-enable after
SET mapEnabled true
```

The player starts with the map enabled by default.

## Moving Characters Between Locations

Characters can be moved to different locations:

```text
SET characterLocation merchant market
```

This assigns the `merchant` character to the `market` location. If the merchant was previously at the tavern, the merchant will disappear from the tavern and become available at the market. Only characters assigned to the player's current location appear in the `charactersHere` list.

## Check Your Work

Run `npm run validate`, or select **Validate** in Studio. It confirms that map markers point at existing locations, that no location sits on two maps, and that `startLocation` and travel references resolve. Then open the game and travel: the new location should appear on the map, cost travel time, and run any triggered dialogue on arrival.

Next, give the place inhabitants with [Characters & Party](/guides/characters-and-party/), or set its mood with [Audio](/guides/audio/).
