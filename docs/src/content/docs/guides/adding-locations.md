---
title: Adding Locations
description: How to create locations and connect them with maps.
---

Locations are the places in your game world. Players travel between them using the map.

## Defining a Location

Create `content/locations/tavern.yaml`:

```yaml
id: tavern
name: '@location.tavern.name'
description: '@location.tavern.description'
banner: tavern.png
music: tavern_ambience.ogg
ambient: ''
```

| Field         | Description                                                       |
| ------------- | ----------------------------------------------------------------- |
| `id`          | Unique identifier, used in dialogue effects and map references    |
| `name`        | Display name (use `@key` for localization)                        |
| `description` | Text shown when the player is at this location                    |
| `banner`      | Image displayed at the top of the location view                   |
| `music`       | Background music track (auto-plays, crossfades between locations) |
| `ambient`     | Ambient sound loop (plays alongside music)                        |

## Creating a Map

Maps connect locations and let players travel between them. Create `content/maps/town.yaml`:

```yaml
id: town
name: '@map.town.name'
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

### Map Scale

The `scale` field controls travel time. It represents **pixels per hour** of travel.

To calculate your scale: divide your map's width in pixels by how many hours you want it to take to cross the entire map.

**Example**: A 500px wide map where crossing takes 5 hours → `scale: 100`

**Formula**: `travel time = distance in pixels / scale`

Minimum travel time is always 1 hour, regardless of scale.

## Location Intro Dialogues

Use triggered dialogues to narrate a location's first visit:

```
# content/dialogues/tavern_intro.dlg
TRIGGER tavern
REQUIRE notFlag seenTavernIntro

NODE start
  NARRATOR: @narrator.tavern_intro
  SET flag seenTavernIntro

  CHOICE @narrator.choice.look_around
    END dialogue
  END
```

The `TRIGGER` keyword auto-starts this dialogue when the player enters the tavern. The `REQUIRE notFlag` ensures it only fires once.

## Travel Effects

When a player travels to a location:

1. `currentLocation` updates to the new location
2. Time advances based on map `scale` and distance — formula: `travel time = distance in pixels / scale`
3. Any active dialogue ends
4. Triggered dialogues at the new location are checked

You can also move the player via dialogue effects:

```
CHOICE @npc.choice.follow_me
  GOTO location market
END
```

## Enabling/Disabling the Map

The map can be toggled with the `SET mapEnabled` effect:

```
# Disable map during a dialogue sequence
SET mapEnabled false

# Re-enable after
SET mapEnabled true
```

The player starts with the map enabled by default.

## Moving Characters Between Locations

Characters can be moved to different locations:

```
SET characterLocation merchant market
```

Only characters at the player's current location appear in the `charactersHere` list.
