---
title: Adding Locations
description: How to create locations and connect them with maps.
---

Locations are the places in your game world. Players travel between them using the map.

## Defining a Location

Create `content/locations/tavern.yaml`:

```yaml
id: tavern
name: The Salty Dog
description: A warm tavern overlooking the harbor.
banner: tavern.png
music: tavern_ambience.ogg
ambient: fireplace.ogg
```

| Field         | Description                                                       |
| ------------- | ----------------------------------------------------------------- |
| `id`          | Unique identifier, used in dialogue effects and map references    |
| `name`        | Display name                                                      |
| `description` | Text shown when the player is at this location                    |
| `banner`      | Image associated with the location                                |
| `music`       | Background music track                                             |
| `ambient`     | Ambient sound loop                                                 |

## Creating a Map

Maps connect locations and let players travel between them. Create `content/maps/town.yaml`:

```yaml
id: town
name: Harbor Town
image: town_map.png
scale: 100
locations:
    - id: tavern
      x: 200
      y: 350
    - id: market
      x: 500
      y: 200
```

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

**Formula**: `travel time = distance in pixels / scale`

Minimum travel time is always 1 hour, regardless of scale.

## Location Intro Dialogues

Use triggered dialogues to narrate a location's first visit:

```text
# content/dialogues/tavern_intro.dlg
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
2. Time advances based on map `scale` and distance. The formula is `travel time = distance in pixels / scale`.
3. Any active dialogue ends
4. Triggered dialogues and interludes at the new location are checked

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
