/**
 * Tests for the DSL Parser
 * Verifies parsing of all DSL syntax into Dialogue entities
 */

import { describe, it, expect } from 'vitest'
import { parseDialogue, parseCondition, parseEffect } from '../parser'
import type { Condition } from '../types/conditions'
import type { Effect } from '../types/effects'

describe('parseCondition', () => {
  it('should parse hasFlag', () => {
    const condition = parseCondition('hasFlag metBartender')
    expect(condition).toEqual({ type: 'hasFlag', flag: 'metBartender' })
  })

  it('should parse notFlag', () => {
    const condition = parseCondition('notFlag doorLocked')
    expect(condition).toEqual({ type: 'notFlag', flag: 'doorLocked' })
  })

  it('should parse hasItem', () => {
    const condition = parseCondition('hasItem rusty_key')
    expect(condition).toEqual({ type: 'hasItem', itemId: 'rusty_key' })
  })

  it('should parse variableEquals with number', () => {
    const condition = parseCondition('variableEquals gold 100')
    expect(condition).toEqual({
      type: 'variableEquals',
      variable: 'gold',
      value: 100,
    })
  })

  it('should parse variableEquals with string', () => {
    const condition = parseCondition('variableEquals name John')
    expect(condition).toEqual({
      type: 'variableEquals',
      variable: 'name',
      value: 'John',
    })
  })

  it('should parse variableGreaterThan', () => {
    const condition = parseCondition('variableGreaterThan gold 50')
    expect(condition).toEqual({
      type: 'variableGreaterThan',
      variable: 'gold',
      value: 50,
    })
  })

  it('should parse variableLessThan', () => {
    const condition = parseCondition('variableLessThan reputation 0')
    expect(condition).toEqual({
      type: 'variableLessThan',
      variable: 'reputation',
      value: 0,
    })
  })

  it('should parse atLocation', () => {
    const condition = parseCondition('atLocation tavern')
    expect(condition).toEqual({ type: 'atLocation', locationId: 'tavern' })
  })

  it('should parse questAtStage', () => {
    const condition = parseCondition('questAtStage main_quest started')
    expect(condition).toEqual({
      type: 'questAtStage',
      questId: 'main_quest',
      stageId: 'started',
    })
  })

  it('should parse characterAt', () => {
    const condition = parseCondition('characterAt merchant market')
    expect(condition).toEqual({
      type: 'characterAt',
      characterId: 'merchant',
      locationId: 'market',
    })
  })

  it('should parse characterInParty', () => {
    const condition = parseCondition('characterInParty jaheira')
    expect(condition).toEqual({
      type: 'characterInParty',
      characterId: 'jaheira',
    })
  })

  it('should parse relationshipAbove', () => {
    const condition = parseCondition('relationshipAbove bartender 5')
    expect(condition).toEqual({
      type: 'relationshipAbove',
      characterId: 'bartender',
      value: 5,
    })
  })

  it('should parse relationshipBelow', () => {
    const condition = parseCondition('relationshipBelow merchant -10')
    expect(condition).toEqual({
      type: 'relationshipBelow',
      characterId: 'merchant',
      value: -10,
    })
  })

  it('should parse timeIs', () => {
    const condition = parseCondition('timeIs 20 6')
    expect(condition).toEqual({
      type: 'timeIs',
      startHour: 20,
      endHour: 6,
    })
  })

  it('should parse itemAt', () => {
    const condition = parseCondition('itemAt sword armory')
    expect(condition).toEqual({
      type: 'itemAt',
      itemId: 'sword',
      locationId: 'armory',
    })
  })

  it('should throw on unknown condition type', () => {
    expect(() => parseCondition('unknownCondition foo')).toThrow(
      'Unknown condition type: unknownCondition'
    )
  })
})

describe('parseEffect', () => {
  it('should parse SET flag', () => {
    const effect = parseEffect('SET flag metBartender')
    expect(effect).toEqual({ type: 'setFlag', flag: 'metBartender' })
  })

  it('should parse CLEAR flag', () => {
    const effect = parseEffect('CLEAR flag doorLocked')
    expect(effect).toEqual({ type: 'clearFlag', flag: 'doorLocked' })
  })

  it('should parse SET variable with number', () => {
    const effect = parseEffect('SET variable gold 100')
    expect(effect).toEqual({
      type: 'setVariable',
      variable: 'gold',
      value: 100,
    })
  })

  it('should parse SET variable with string', () => {
    const effect = parseEffect('SET variable name John')
    expect(effect).toEqual({
      type: 'setVariable',
      variable: 'name',
      value: 'John',
    })
  })

  it('should parse ADD variable with negative number', () => {
    const effect = parseEffect('ADD variable gold -50')
    expect(effect).toEqual({
      type: 'addVariable',
      variable: 'gold',
      value: -50,
    })
  })

  it('should parse ADD item', () => {
    const effect = parseEffect('ADD item rusty_key')
    expect(effect).toEqual({ type: 'addItem', itemId: 'rusty_key' })
  })

  it('should parse REMOVE item', () => {
    const effect = parseEffect('REMOVE item rusty_key')
    expect(effect).toEqual({ type: 'removeItem', itemId: 'rusty_key' })
  })

  it('should parse MOVE item', () => {
    const effect = parseEffect('MOVE item sword armory')
    expect(effect).toEqual({
      type: 'moveItem',
      itemId: 'sword',
      locationId: 'armory',
    })
  })

  it('should parse SET questStage', () => {
    const effect = parseEffect('SET questStage main_quest started')
    expect(effect).toEqual({
      type: 'setQuestStage',
      questId: 'main_quest',
      stageId: 'started',
    })
  })

  it('should parse ADD journalEntry', () => {
    const effect = parseEffect('ADD journalEntry chapter_1')
    expect(effect).toEqual({
      type: 'addJournalEntry',
      entryId: 'chapter_1',
    })
  })

  it('should parse SET characterLocation', () => {
    const effect = parseEffect('SET characterLocation merchant tavern')
    expect(effect).toEqual({
      type: 'setCharacterLocation',
      characterId: 'merchant',
      locationId: 'tavern',
    })
  })

  it('should parse ADD toParty', () => {
    const effect = parseEffect('ADD toParty jaheira')
    expect(effect).toEqual({ type: 'addToParty', characterId: 'jaheira' })
  })

  it('should parse REMOVE fromParty', () => {
    const effect = parseEffect('REMOVE fromParty jaheira')
    expect(effect).toEqual({ type: 'removeFromParty', characterId: 'jaheira' })
  })

  it('should parse SET relationship', () => {
    const effect = parseEffect('SET relationship bartender 5')
    expect(effect).toEqual({
      type: 'setRelationship',
      characterId: 'bartender',
      value: 5,
    })
  })

  it('should parse ADD relationship', () => {
    const effect = parseEffect('ADD relationship bartender 1')
    expect(effect).toEqual({
      type: 'addRelationship',
      characterId: 'bartender',
      value: 1,
    })
  })

  it('should parse SET characterStat', () => {
    const effect = parseEffect('SET characterStat jaheira level 5')
    expect(effect).toEqual({
      type: 'setCharacterStat',
      characterId: 'jaheira',
      stat: 'level',
      value: 5,
    })
  })

  it('should parse ADD characterStat', () => {
    const effect = parseEffect('ADD characterStat jaheira health -10')
    expect(effect).toEqual({
      type: 'addCharacterStat',
      characterId: 'jaheira',
      stat: 'health',
      value: -10,
    })
  })

  it('should parse SET mapEnabled', () => {
    const effect = parseEffect('SET mapEnabled false')
    expect(effect).toEqual({ type: 'setMapEnabled', enabled: false })
  })

  it('should parse ADVANCE time', () => {
    const effect = parseEffect('ADVANCE time 2')
    expect(effect).toEqual({ type: 'advanceTime', hours: 2 })
  })

  it('should parse START dialogue', () => {
    const effect = parseEffect('START dialogue merchant_intro')
    expect(effect).toEqual({
      type: 'startDialogue',
      dialogueId: 'merchant_intro',
    })
  })

  it('should parse END dialogue', () => {
    const effect = parseEffect('END dialogue')
    expect(effect).toEqual({ type: 'endDialogue' })
  })

  it('should parse MUSIC with filename', () => {
    const effect = parseEffect('MUSIC tension_theme.ogg')
    expect(effect).toEqual({
      type: 'playMusic',
      track: 'tension_theme.ogg',
    })
  })

  it('should parse SOUND with filename', () => {
    const effect = parseEffect('SOUND door_slam.ogg')
    expect(effect).toEqual({ type: 'playSound', sound: 'door_slam.ogg' })
  })

  it('should parse NOTIFY with localization key', () => {
    const effect = parseEffect('NOTIFY @quest.started')
    expect(effect).toEqual({ type: 'notify', message: '@quest.started' })
  })

  it('should parse NOTIFY with quoted text', () => {
    const effect = parseEffect('NOTIFY "Quest started!"')
    expect(effect).toEqual({ type: 'notify', message: 'Quest started!' })
  })

  it('should parse VIDEO with filename', () => {
    const effect = parseEffect('VIDEO intro.mp4')
    expect(effect).toEqual({ type: 'playVideo', file: 'intro.mp4' })
  })

  it('should parse INTERLUDE with interlude ID', () => {
    const effect = parseEffect('INTERLUDE chapter_one')
    expect(effect).toEqual({ type: 'showInterlude', interludeId: 'chapter_one' })
  })

  it('should parse ROLL effect', () => {
    const effect = parseEffect('ROLL bluffRoll 1 20')
    expect(effect).toEqual({
      type: 'roll',
      variable: 'bluffRoll',
      min: 1,
      max: 20,
    })
  })

  it('should throw on unknown effect', () => {
    expect(() => parseEffect('UNKNOWN effect foo')).toThrow(
      'Unknown effect keyword: UNKNOWN'
    )
  })
})

describe('parseCondition - roll', () => {
  it('should parse roll condition', () => {
    const condition = parseCondition('roll 1 20 15')
    expect(condition).toEqual({
      type: 'roll',
      min: 1,
      max: 20,
      threshold: 15,
    })
  })
})

describe('parseDialogue - simple', () => {
  it('should parse a simple dialogue with one node', () => {
    const dsl = `
NODE intro

BARTENDER: @bartender.greeting
  VOICE bartender_01.ogg

SET flag metBartender
`

    const dialogue = parseDialogue(dsl, 'bartender_greeting')

    expect(dialogue.id).toBe('bartender_greeting')
    expect(dialogue.startNode).toBe('intro')
    expect(dialogue.nodes).toHaveLength(1)

    const node = dialogue.nodes[0]
    expect(node.id).toBe('intro')
    expect(node.speaker).toBe('bartender')
    expect(node.text).toBe('@bartender.greeting')
    expect(node.voice).toBe('bartender_01.ogg')
    expect(node.effects).toHaveLength(1)
    expect(node.effects?.[0]).toEqual({ type: 'setFlag', flag: 'metBartender' })
  })

  it('should parse narrator dialogue', () => {
    const dsl = `
NODE intro

NARRATOR: @tavern.description

END dialogue
`

    const dialogue = parseDialogue(dsl, 'tavern_enter')

    const node = dialogue.nodes[0]
    expect(node.speaker).toBeNull()
    expect(node.text).toBe('@tavern.description')
    expect(node.effects).toHaveLength(1)
    expect(node.effects?.[0]).toEqual({ type: 'endDialogue' })
  })

  it('should parse dialogue with quoted inline text', () => {
    const dsl = `
NODE intro

BARTENDER: "Welcome to the tavern!"

SET flag visited
`

    const dialogue = parseDialogue(dsl, 'test')

    const node = dialogue.nodes[0]
    expect(node.text).toBe('Welcome to the tavern!')
  })

  it('should handle comments', () => {
    const dsl = `
# This is a comment
NODE intro  # Another comment

BARTENDER: @greeting  # Inline comment

# Full line comment
SET flag metBartender
`

    const dialogue = parseDialogue(dsl, 'test')

    expect(dialogue.nodes).toHaveLength(1)
    expect(dialogue.nodes[0].text).toBe('@greeting')
  })
})

describe('parseDialogue - with choices', () => {
  it('should parse a node with choices', () => {
    const dsl = `
NODE intro

BARTENDER: @bartender.greeting

CHOICE @choice.hello
  SET flag greeted
  GOTO response
END

CHOICE @choice.goodbye
  END dialogue
END
`

    const dialogue = parseDialogue(dsl, 'test')

    const node = dialogue.nodes[0]
    expect(node.choices).toHaveLength(2)

    const choice1 = node.choices[0]
    expect(choice1.text).toBe('@choice.hello')
    expect(choice1.effects).toHaveLength(1)
    expect(choice1.effects?.[0]).toEqual({ type: 'setFlag', flag: 'greeted' })
    expect(choice1.next).toBe('response')

    const choice2 = node.choices[1]
    expect(choice2.text).toBe('@choice.goodbye')
    expect(choice2.effects).toHaveLength(1)
    expect(choice2.effects?.[0]).toEqual({ type: 'endDialogue' })
  })

  it('should parse choices with conditions', () => {
    const dsl = `
NODE intro

BARTENDER: @greeting

CHOICE @choice.work
  REQUIRE variableGreaterThan gold 10
  REQUIRE hasFlag metBartender
  SET questStage odd_jobs started
  GOTO work_dialogue
END
`

    const dialogue = parseDialogue(dsl, 'test')

    const choice = dialogue.nodes[0].choices[0]
    expect(choice.conditions).toHaveLength(2)
    expect(choice.conditions?.[0]).toEqual({
      type: 'variableGreaterThan',
      variable: 'gold',
      value: 10,
    })
    expect(choice.conditions?.[1]).toEqual({
      type: 'hasFlag',
      flag: 'metBartender',
    })
  })

  it('should parse GOTO location in choice', () => {
    const dsl = `
NODE intro

NARRATOR: @description

CHOICE @choice.leave
  GOTO location market
END
`

    const dialogue = parseDialogue(dsl, 'test')

    const choice = dialogue.nodes[0].choices[0]
    expect(choice.effects).toHaveLength(2)
    expect(choice.effects?.[0]).toEqual({
      type: 'goToLocation',
      locationId: 'market',
    })
    expect(choice.effects?.[1]).toEqual({ type: 'endDialogue' })
  })
})

describe('parseDialogue - with IF blocks', () => {
  it('should parse IF block with GOTO', () => {
    const dsl = `
NODE intro

BARTENDER: @greeting

IF hasFlag metBartender
  GOTO returning
END

SET flag metBartender
`

    const dialogue = parseDialogue(dsl, 'test')

    const node = dialogue.nodes[0]
    // IF blocks are stored as conditionalNext (extension to base type)
    expect((node as any).conditionalNext).toHaveLength(1)
    expect((node as any).conditionalNext[0]).toEqual({
      condition: { type: 'hasFlag', flag: 'metBartender' },
      next: 'returning',
    })
    // The SET flag effect should still be parsed
    expect(node.effects).toHaveLength(1)
    expect(node.effects?.[0]).toEqual({ type: 'setFlag', flag: 'metBartender' })
  })

  it('should parse IF block with effects', () => {
    const dsl = `
NODE intro

NARRATOR: @description

IF variableGreaterThan gold 100
  SET flag rich
  ADD variable reputation 5
END
`

    const dialogue = parseDialogue(dsl, 'test')

    const node = dialogue.nodes[0]
    // IF block effects are added to node effects
    expect(node.effects).toHaveLength(2)
    expect(node.effects?.[0]).toEqual({ type: 'setFlag', flag: 'rich' })
    expect(node.effects?.[1]).toEqual({
      type: 'addVariable',
      variable: 'reputation',
      value: 5,
    })
  })
})

describe('parseDialogue - triggered dialogues', () => {
  it('should parse TRIGGER directive', () => {
    const dsl = `
TRIGGER tavern

NODE intro

NARRATOR: @description
`

    const dialogue = parseDialogue(dsl, 'tavern_enter')

    expect(dialogue.triggerLocation).toBe('tavern')
  })

  it('should parse TRIGGER with REQUIRE conditions', () => {
    const dsl = `
TRIGGER tavern
REQUIRE notFlag visited_tavern
REQUIRE questAtStage main_quest investigating

NODE intro

NARRATOR: @dramatic_entrance
`

    const dialogue = parseDialogue(dsl, 'tavern_dramatic')

    expect(dialogue.triggerLocation).toBe('tavern')
    expect(dialogue.conditions).toHaveLength(2)
    expect(dialogue.conditions?.[0]).toEqual({
      type: 'notFlag',
      flag: 'visited_tavern',
    })
    expect(dialogue.conditions?.[1]).toEqual({
      type: 'questAtStage',
      questId: 'main_quest',
      stageId: 'investigating',
    })
  })
})

describe('parseDialogue - multiple nodes', () => {
  it('should parse dialogue with multiple nodes', () => {
    const dsl = `
NODE intro

BARTENDER: @greeting

CHOICE @choice.hello
  GOTO friendly
END

CHOICE @choice.rude
  GOTO hostile
END

NODE friendly

BARTENDER: @friendly_response

END dialogue

NODE hostile

BARTENDER: @hostile_response

END dialogue
`

    const dialogue = parseDialogue(dsl, 'test')

    expect(dialogue.nodes).toHaveLength(3)
    expect(dialogue.startNode).toBe('intro')

    expect(dialogue.nodes[0].id).toBe('intro')
    expect(dialogue.nodes[1].id).toBe('friendly')
    expect(dialogue.nodes[2].id).toBe('hostile')
  })
})

describe('parseDialogue - complex example', () => {
  it('should parse a complex dialogue from the design doc', () => {
    const dsl = `
TRIGGER tavern
REQUIRE notFlag visited_tavern

NODE intro

NARRATOR: @tavern.enter.description
SOUND door_creak.ogg

SET flag visited_tavern
ADD journalEntry tavern_discovery

CHOICE @tavern.choice.look_around
  NARRATOR: @tavern.look_around
  GOTO idle
END

CHOICE @tavern.choice.approach_bar
  GOTO approach_bar
END

CHOICE @tavern.choice.leave
  GOTO location docks
END
`

    const dialogue = parseDialogue(dsl, 'tavern_enter')

    expect(dialogue.id).toBe('tavern_enter')
    expect(dialogue.triggerLocation).toBe('tavern')
    expect(dialogue.conditions).toHaveLength(1)
    expect(dialogue.conditions?.[0]).toEqual({
      type: 'notFlag',
      flag: 'visited_tavern',
    })

    expect(dialogue.nodes).toHaveLength(1)
    const node = dialogue.nodes[0]

    expect(node.id).toBe('intro')
    expect(node.speaker).toBeNull()
    expect(node.text).toBe('@tavern.enter.description')

    expect(node.effects).toHaveLength(3)
    expect(node.effects?.[0]).toEqual({
      type: 'playSound',
      sound: 'door_creak.ogg',
    })
    expect(node.effects?.[1]).toEqual({ type: 'setFlag', flag: 'visited_tavern' })
    expect(node.effects?.[2]).toEqual({
      type: 'addJournalEntry',
      entryId: 'tavern_discovery',
    })

    expect(node.choices).toHaveLength(3)
    expect(node.choices[0].text).toBe('@tavern.choice.look_around')
    expect(node.choices[0].next).toBe('idle')

    expect(node.choices[2].text).toBe('@tavern.choice.leave')
    expect(node.choices[2].effects?.[0]).toEqual({
      type: 'goToLocation',
      locationId: 'docks',
    })
  })
})

describe('parseDialogue - error handling', () => {
  it('should throw on unexpected token', () => {
    const dsl = `
UNEXPECTED_KEYWORD foo

NODE intro
NARRATOR: test
`

    expect(() => parseDialogue(dsl, 'test')).toThrow('Unexpected token')
  })
})
