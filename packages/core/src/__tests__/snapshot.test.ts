/**
 * Tests for snapshot builder.
 * Verifies that snapshots correctly resolve localization and enrich entities.
 */

import { describe, it, expect } from 'vitest'
import { buildSnapshot } from '../snapshot'
import type { ContentRegistry } from '../types/registry'
import type { GameState } from '../types/state'

// Test fixtures
function createTestRegistry(): ContentRegistry {
  return {
    locations: {
      tavern: {
        id: 'tavern',
        name: '@location.tavern.name',
        description: '@location.tavern.description',
        banner: 'tavern_banner.png',
        music: 'tavern_theme.ogg',
        ambient: 'tavern_ambience.ogg',
      },
      market: {
        id: 'market',
        name: '@location.market.name',
        description: '@location.market.description',
        banner: 'market_banner.png',
        music: 'market_theme.ogg',
        ambient: 'market_ambience.ogg',
      },
    },
    characters: {
      bartender: {
        id: 'bartender',
        name: '@character.bartender.name',
        biography: '@character.bartender.bio',
        portrait: 'bartender.png',
        location: 'tavern',
        dialogue: 'bartender_greeting',
        stats: {},
      },
      pixel_the_dog: {
        id: 'pixel_the_dog',
        name: '@character.pixel.name',
        biography: '@character.pixel.bio',
        portrait: 'pixel.png',
        location: 'camp',
        dialogue: 'pixel_greeting',
        stats: {},
      },
    },
    items: {
      rusty_key: {
        id: 'rusty_key',
        name: '@item.rusty_key.name',
        description: '@item.rusty_key.description',
        icon: 'key_icon.png',
        image: 'key_full.png',
        location: 'cellar',
        stats: {},
      },
      letter: {
        id: 'letter',
        name: '@item.letter.name',
        description: '@item.letter.description',
        icon: 'letter_icon.png',
        image: 'letter_full.png',
        location: 'inventory',
        stats: {},
      },
    },
    maps: {
      city: {
        id: 'city',
        name: '@map.city.name',
        image: 'city_map.png',
        scale: 1,
        locations: [
          { id: 'tavern', x: 100, y: 150 },
          { id: 'market', x: 250, y: 200 },
        ],
      },
    },
    dialogues: {
      bartender_greeting: {
        id: 'bartender_greeting',
        startNode: 'intro',
        nodes: [
          {
            id: 'intro',
            speaker: 'bartender',
            text: '@bartender.greeting',
            choices: [
              {
                id: 'choice_1',
                text: '@bartender.choice.hello',
                next: 'response',
              },
              {
                id: 'choice_2',
                text: '@bartender.choice.bye',
                conditions: [{ type: 'hasFlag', flag: 'metBefore' }],
                next: 'goodbye',
              },
            ],
          },
        ],
      },
    },
    quests: {
      odd_jobs: {
        id: 'odd_jobs',
        name: '@quest.odd_jobs.name',
        description: '@quest.odd_jobs.description',
        stages: [
          { id: 'started', description: '@quest.odd_jobs.stage.started' },
          { id: 'complete', description: '@quest.odd_jobs.stage.complete' },
        ],
      },
    },
    journalEntries: {
      tavern_discovery: {
        id: 'tavern_discovery',
        title: '@journal.tavern.title',
        text: '@journal.tavern.text',
        category: 'places',
      },
    },
    locales: {
      en: {
        'location.tavern.name': 'The Salty Dog',
        'location.tavern.description': 'A dimly lit tavern',
        'location.market.name': 'Central Market',
        'location.market.description': 'A bustling marketplace',
        'character.bartender.name': 'Marcus',
        'character.bartender.bio': 'A gruff bartender',
        'character.pixel.name': 'Pixel the Dog',
        'character.pixel.bio': 'A loyal companion',
        'item.rusty_key.name': 'Rusty Key',
        'item.rusty_key.description': 'An old rusty key',
        'item.letter.name': 'Letter',
        'item.letter.description': 'A sealed letter',
        'map.city.name': 'City Map',
        'bartender.greeting': 'Welcome stranger',
        'bartender.choice.hello': 'Hello there',
        'bartender.choice.bye': 'Goodbye',
        'quest.odd_jobs.name': 'Odd Jobs',
        'quest.odd_jobs.description': 'Help the locals',
        'quest.odd_jobs.stage.started': 'Find someone who needs help',
        'quest.odd_jobs.stage.complete': 'All tasks complete',
        'journal.tavern.title': 'The Salty Dog',
        'journal.tavern.text': 'I found a tavern',
        'notification.test': 'Test notification',
      },
    },
  }
}

function createTestState(): GameState {
  return {
    currentLocation: 'tavern',
    currentTime: { day: 1, hour: 14 },
    flags: {},
    variables: {},
    inventory: ['letter'],
    questProgress: { odd_jobs: 'started' },
    unlockedJournalEntries: ['tavern_discovery'],
    playerNotes: [],
    dialogueState: null,
    characterState: {
      bartender: {
        location: 'tavern',
        inParty: false,
        relationship: 5,
        stats: {},
      },
      pixel_the_dog: {
        location: 'camp',
        inParty: true,
        relationship: 10,
        stats: { level: 3 },
      },
    },
    itemLocations: {
      rusty_key: 'tavern',
      letter: 'inventory',
    },
    mapEnabled: true,
    notifications: ['@notification.test'],
    pendingSounds: [],
    pendingVideo: null,
    pendingInterlude: null,
    currentLocale: 'en',
  }
}

describe('Snapshot Builder', () => {
  describe('buildSnapshot', () => {
    it('should build a complete snapshot', () => {
      const state = createTestState()
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot).toBeDefined()
      expect(snapshot.location).toBeDefined()
      expect(snapshot.time).toEqual({ day: 1, hour: 14 })
    })

    it('should resolve location localization', () => {
      const state = createTestState()
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.location.name).toBe('The Salty Dog')
      expect(snapshot.location.description).toBe('A dimly lit tavern')
    })

    it('should include characters at current location', () => {
      const state = createTestState()
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.charactersHere).toHaveLength(1)
      expect(snapshot.charactersHere[0].id).toBe('bartender')
      expect(snapshot.charactersHere[0].name).toBe('Marcus')
    })

    it('should include items at current location', () => {
      const state = createTestState()
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.itemsHere).toHaveLength(1)
      expect(snapshot.itemsHere[0].id).toBe('rusty_key')
      expect(snapshot.itemsHere[0].name).toBe('Rusty Key')
    })

    it('should not include items in inventory as itemsHere', () => {
      const state = createTestState()
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.itemsHere.find(i => i.id === 'letter')).toBeUndefined()
    })

    it('should include party members', () => {
      const state = createTestState()
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.party).toHaveLength(1)
      expect(snapshot.party[0].id).toBe('pixel_the_dog')
      expect(snapshot.party[0].name).toBe('Pixel the Dog')
      expect(snapshot.party[0].inParty).toBe(true)
    })

    it('should include inventory items', () => {
      const state = createTestState()
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.inventory).toHaveLength(1)
      expect(snapshot.inventory[0].id).toBe('letter')
      expect(snapshot.inventory[0].name).toBe('Letter')
    })

    it('should include active quests with resolved text', () => {
      const state = createTestState()
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.quests).toHaveLength(1)
      expect(snapshot.quests[0].id).toBe('odd_jobs')
      expect(snapshot.quests[0].name).toBe('Odd Jobs')
      expect(snapshot.quests[0].currentStage).toBe('started')
      expect(snapshot.quests[0].currentStageDescription).toBe('Find someone who needs help')
    })

    it('should include unlocked journal entries', () => {
      const state = createTestState()
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.journal).toHaveLength(1)
      expect(snapshot.journal[0].id).toBe('tavern_discovery')
      expect(snapshot.journal[0].title).toBe('The Salty Dog')
      expect(snapshot.journal[0].text).toBe('I found a tavern')
    })

    it('should include map when enabled', () => {
      const state = createTestState()
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.map).not.toBeNull()
      expect(snapshot.map?.name).toBe('City Map')
      expect(snapshot.map?.locations).toHaveLength(2)
      expect(snapshot.map?.locations.find(l => l.isCurrent)?.id).toBe('tavern')
    })

    it('should not include map when disabled', () => {
      const state = { ...createTestState(), mapEnabled: false }
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.map).toBeNull()
    })

    it('should include music and ambient from location', () => {
      const state = createTestState()
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.music).toBe('tavern_theme.ogg')
      expect(snapshot.ambient).toBe('tavern_ambience.ogg')
    })

    it('should resolve notification localization', () => {
      const state = createTestState()
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.notifications).toContain('Test notification')
    })

    it('should include pendingVideo when set', () => {
      const state = { ...createTestState(), pendingVideo: 'intro.mp4' }
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.pendingVideo).toBe('intro.mp4')
    })

    it('should have null pendingVideo by default', () => {
      const state = createTestState()
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.pendingVideo).toBeNull()
    })
  })

  describe('dialogue snapshot', () => {
    it('should include dialogue when in dialogue state', () => {
      const state = {
        ...createTestState(),
        dialogueState: { dialogueId: 'bartender_greeting', nodeId: 'intro' },
      }
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.dialogue).not.toBeNull()
      expect(snapshot.dialogue?.speaker).toBe('bartender')
      expect(snapshot.dialogue?.speakerName).toBe('Marcus')
      expect(snapshot.dialogue?.text).toBe('Welcome stranger')
    })

    it('should filter choices by conditions', () => {
      const state = {
        ...createTestState(),
        dialogueState: { dialogueId: 'bartender_greeting', nodeId: 'intro' },
      }
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      // choice_2 requires hasFlag metBefore which is not set
      expect(snapshot.choices).toHaveLength(1)
      expect(snapshot.choices[0].id).toBe('choice_1')
      expect(snapshot.choices[0].text).toBe('Hello there')
    })

    it('should include choices when conditions pass', () => {
      const state = {
        ...createTestState(),
        flags: { metBefore: true },
        dialogueState: { dialogueId: 'bartender_greeting', nodeId: 'intro' },
      }
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.choices).toHaveLength(2)
    })

    it('should be null when not in dialogue', () => {
      const state = createTestState()
      const registry = createTestRegistry()
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.dialogue).toBeNull()
      expect(snapshot.choices).toHaveLength(0)
    })
  })

  describe('variable interpolation', () => {
    it('should substitute {varName} placeholders in dialogue text', () => {
      const state = {
        ...createTestState(),
        variables: { bluffRoll: 17 },
        dialogueState: { dialogueId: 'bartender_greeting', nodeId: 'intro' },
      }
      const registry = {
        ...createTestRegistry(),
        locales: {
          en: {
            ...createTestRegistry().locales.en,
            'bartender.greeting': 'You rolled a {bluffRoll}!',
          },
        },
      }
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.dialogue?.text).toBe('You rolled a 17!')
    })

    it('should substitute {varName} in plain text dialogue', () => {
      const state = {
        ...createTestState(),
        variables: { gold: 50 },
        dialogueState: { dialogueId: 'bartender_greeting', nodeId: 'intro' },
      }
      const registry = {
        ...createTestRegistry(),
        dialogues: {
          bartender_greeting: {
            id: 'bartender_greeting',
            startNode: 'intro',
            nodes: [
              {
                id: 'intro',
                speaker: 'bartender',
                text: 'You have {gold} gold.',
                choices: [],
              },
            ],
          },
        },
      }
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.dialogue?.text).toBe('You have 50 gold.')
    })

    it('should leave unknown {varName} unchanged', () => {
      const state = {
        ...createTestState(),
        variables: {},
        dialogueState: { dialogueId: 'bartender_greeting', nodeId: 'intro' },
      }
      const registry = {
        ...createTestRegistry(),
        dialogues: {
          bartender_greeting: {
            id: 'bartender_greeting',
            startNode: 'intro',
            nodes: [
              {
                id: 'intro',
                speaker: 'bartender',
                text: 'You have {gold} gold.',
                choices: [],
              },
            ],
          },
        },
      }
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.dialogue?.text).toBe('You have {gold} gold.')
    })
  })

  describe('localization fallback', () => {
    it('should use key as fallback when translation missing', () => {
      const state = createTestState()
      const registry = {
        ...createTestRegistry(),
        locations: {
          tavern: {
            id: 'tavern',
            name: '@missing.key',
            description: 'Inline text',
            banner: '',
            music: '',
            ambient: '',
          },
        },
      }
      const snapshot = buildSnapshot(state, registry)

      expect(snapshot.location.name).toBe('@missing.key')
      expect(snapshot.location.description).toBe('Inline text')
    })
  })
})
