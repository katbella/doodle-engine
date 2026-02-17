/**
 * doodle create
 *
 * Scaffolds a new Doodle Engine game project
 */

import prompts from 'prompts'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { crayon } from 'crayon.js'

const paw = '🐾'
const dog = '🐕'
const bone = '🦴'
const sparkle = '✨'
const folder = '📁'
const check = '✅'
const rocket = '🚀'

export async function create(projectName: string) {
  const projectPath = join(process.cwd(), projectName)

  console.log('')
  console.log(crayon.bold.magenta(`  ${paw} Doodle Engine ${paw}`))
  console.log(crayon.dim('  Text-based RPG and Adventure Game Scaffolder'))
  console.log('')
  console.log(`  ${dog} Creating new game: ${crayon.bold.cyan(projectName)}`)
  console.log('')

  // Prompt for renderer choice
  const { useDefaultRenderer } = await prompts({
    type: 'confirm',
    name: 'useDefaultRenderer',
    message: 'Use default renderer?',
    initial: true,
  })

  if (useDefaultRenderer === undefined) {
    console.log(crayon.yellow(`\n  ${bone} No worries, maybe next time! Woof!`))
    process.exit(0)
  }

  console.log('')

  // Create project structure
  await createProjectStructure(projectPath, projectName, useDefaultRenderer)

  console.log('')
  console.log(crayon.bold.green(`  ${check} Project created successfully!`))
  console.log('')
  console.log(crayon.dim(`  ${folder} ${projectPath}`))
  console.log('')
  console.log(crayon.bold('  Next steps:'))
  console.log(crayon.cyan(`    cd ${projectName}`))
  console.log(crayon.cyan('    npm install       ') + crayon.dim('# or: yarn install / pnpm install'))
  console.log(crayon.cyan('    npm run dev        ') + crayon.dim('# or: yarn dev / pnpm dev'))
  console.log('')
  console.log(crayon.dim(`  ${rocket} Happy game making! ${paw}`))
  console.log('')
}

async function createProjectStructure(
  projectPath: string,
  projectName: string,
  useDefaultRenderer: boolean
) {
  // Create directory structure
  const dirs = [
    'content/locations',
    'content/characters',
    'content/items',
    'content/dialogues',
    'content/quests',
    'content/journal',
    'content/interludes',
    'content/locales',
    'content/maps',
    'assets/images/banners',
    'assets/images/portraits',
    'assets/images/items',
    'assets/images/maps',
    'assets/audio/music',
    'assets/audio/sfx',
    'assets/audio/voice',
    'src',
  ]

  console.log(`  ${folder} ${crayon.bold('Creating directories...')}`)
  for (const dir of dirs) {
    await mkdir(join(projectPath, dir), { recursive: true })
  }
  console.log(crayon.green(`  ${check} Directories created`))
  console.log('')

  // --- package.json ---
  const packageJson = {
    name: projectName,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'doodle dev',
      build: 'doodle build',
      preview: 'vite preview',
    },
    dependencies: {
      '@doodle-engine/core': 'latest',
      '@doodle-engine/react': 'latest',
      react: '^19.0.0',
      'react-dom': '^19.0.0',
    },
    devDependencies: {
      '@doodle-engine/cli': 'latest',
      '@types/react': '^19.0.0',
      '@types/react-dom': '^19.0.0',
      '@vitejs/plugin-react': '^4.3.0',
      typescript: '^5.7.0',
      vite: '^6.0.0',
    },
  }

  console.log(`  ${sparkle} ${crayon.bold('Writing project files...')}`)

  await writeFile(
    join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  )

  // --- tsconfig.json ---
  const tsconfig = {
    compilerOptions: {
      target: 'ES2024',
      lib: ['ES2024', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      moduleResolution: 'bundler',
      jsx: 'react-jsx',
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
    },
    include: ['src'],
  }

  await writeFile(
    join(projectPath, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2)
  )

  // --- index.html ---
  const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Doodle Engine Game</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`

  await writeFile(join(projectPath, 'index.html'), indexHtml)

  // --- src/main.tsx ---
  const mainTsx = `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`

  await writeFile(join(projectPath, 'src/main.tsx'), mainTsx)

  // --- src/App.tsx ---
  let appTsx: string

  if (useDefaultRenderer) {
    appTsx = `import { useEffect, useState } from 'react'
import type { ContentRegistry, GameConfig } from '@doodle-engine/core'
import { GameShell, LoadingScreen } from '@doodle-engine/react'

export function App() {
  const [content, setContent] = useState<{ registry: ContentRegistry; config: GameConfig } | null>(null)

  useEffect(() => {
    fetch('/api/content')
      .then(res => res.json())
      .then(data => setContent({ registry: data.registry, config: data.config }))
  }, [])

  if (!content) {
    return <LoadingScreen />
  }

  return (
    <GameShell
      registry={content.registry}
      config={content.config}
      title="My Doodle Game"
      subtitle="A text-based adventure"
      splashDuration={2000}
      availableLocales={[{ code: 'en', label: 'English' }]}
      devTools={import.meta.env.DEV}
    />
  )
}
`
  } else {
    appTsx = `import { useEffect, useState } from 'react'
import { Engine } from '@doodle-engine/core'
import type { GameState, Snapshot } from '@doodle-engine/core'
import { GameProvider, LoadingScreen, useGame } from '@doodle-engine/react'

export function App() {
  const [game, setGame] = useState<{ engine: Engine; snapshot: Snapshot } | null>(null)

  useEffect(() => {
    fetch('/api/content')
      .then(res => res.json())
      .then(data => {
        const engine = new Engine(data.registry, createEmptyState())
        const snapshot = engine.newGame(data.config)
        setGame({ engine, snapshot })
      })
  }, [])

  if (!game) {
    return <LoadingScreen />
  }

  return (
    <GameProvider engine={game.engine} initialSnapshot={game.snapshot} devTools={import.meta.env.DEV}>
      <GameUI />
    </GameProvider>
  )
}

function GameUI() {
  const { snapshot, actions } = useGame()

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>{snapshot.location.name}</h1>
      <p>{snapshot.location.description}</p>

      {snapshot.dialogue && (
        <div style={{ background: '#f0f0f0', padding: '1rem', borderRadius: '8px', margin: '1rem 0' }}>
          <strong>{snapshot.dialogue.speakerName}:</strong>
          <p>{snapshot.dialogue.text}</p>
          {snapshot.choices.map(choice => (
            <button
              key={choice.id}
              onClick={() => actions.selectChoice(choice.id)}
              style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem 1rem', cursor: 'pointer' }}
            >
              {choice.text}
            </button>
          ))}
        </div>
      )}

      {!snapshot.dialogue && snapshot.charactersHere.length > 0 && (
        <div>
          <h2>Characters here</h2>
          {snapshot.charactersHere.map(char => (
            <button
              key={char.id}
              onClick={() => actions.talkTo(char.id)}
              style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem 1rem', cursor: 'pointer' }}
            >
              Talk to {char.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function createEmptyState(): GameState {
  return {
    currentLocation: '',
    currentTime: { day: 1, hour: 0 },
    flags: {},
    variables: {},
    inventory: [],
    questProgress: {},
    unlockedJournalEntries: [],
    playerNotes: [],
    dialogueState: null,
    characterState: {},
    itemLocations: {},
    mapEnabled: true,
    notifications: [],
    pendingSounds: [],
    pendingVideo: null,
    currentLocale: 'en',
  }
}
`
  }

  await writeFile(join(projectPath, 'src/App.tsx'), appTsx)

  // --- src/index.css ---
  const indexCss = `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`

  await writeFile(join(projectPath, 'src/index.css'), indexCss)

  console.log(crayon.green(`  ${check} Source files created`))
  console.log('')

  // ============================
  // CONTENT FILES
  // ============================

  console.log(`  ${bone} ${crayon.bold('Writing starter content...')}`)

  // --- content/game.yaml ---
  await writeFile(join(projectPath, 'content/game.yaml'), `# Game Configuration
startLocation: tavern
startTime:
  day: 1
  hour: 8
startFlags: {}
startVariables:
  gold: 100
  reputation: 0
  _drinksBought: 0
startInventory: []
`)

  // --- content/locations ---
  await writeFile(join(projectPath, 'content/locations/tavern.yaml'), `id: tavern
name: "@location.tavern.name"
description: "@location.tavern.description"
banner: ""
music: ""
ambient: ""
`)

  await writeFile(join(projectPath, 'content/locations/market.yaml'), `id: market
name: "@location.market.name"
description: "@location.market.description"
banner: ""
music: ""
ambient: ""
`)

  // --- content/characters ---
  await writeFile(join(projectPath, 'content/characters/bartender.yaml'), `id: bartender
name: "@character.bartender.name"
biography: "@character.bartender.bio"
portrait: ""
location: tavern
dialogue: bartender_greeting
stats: {}
`)

  await writeFile(join(projectPath, 'content/characters/merchant.yaml'), `id: merchant
name: "@character.merchant.name"
biography: "@character.merchant.bio"
portrait: ""
location: market
dialogue: merchant_intro
stats: {}
`)

  // --- content/items ---
  await writeFile(join(projectPath, 'content/items/old_coin.yaml'), `id: old_coin
name: "@item.old_coin.name"
description: "@item.old_coin.description"
icon: ""
image: ""
location: tavern
stats: {}
`)

  // --- content/maps ---
  await writeFile(join(projectPath, 'content/maps/town.yaml'), `id: town
name: "@map.town.name"
image: ""
scale: 1
locations:
  - id: tavern
    x: 100
    y: 200
  - id: market
    x: 300
    y: 150
`)

  // --- content/quests ---
  await writeFile(join(projectPath, 'content/quests/odd_jobs.yaml'), `id: odd_jobs
name: "@quest.odd_jobs.name"
description: "@quest.odd_jobs.description"
stages:
  - id: started
    description: "@quest.odd_jobs.stage.started"
  - id: talked_to_merchant
    description: "@quest.odd_jobs.stage.talked_to_merchant"
  - id: complete
    description: "@quest.odd_jobs.stage.complete"
`)

  // --- content/journal ---
  await writeFile(join(projectPath, 'content/journal/tavern_discovery.yaml'), `id: tavern_discovery
title: "@journal.tavern_discovery.title"
text: "@journal.tavern_discovery.text"
category: places
`)

  await writeFile(join(projectPath, 'content/journal/odd_jobs_accepted.yaml'), `id: odd_jobs_accepted
title: "@journal.odd_jobs_accepted.title"
text: "@journal.odd_jobs_accepted.text"
category: quests
`)

  await writeFile(join(projectPath, 'content/journal/market_square.yaml'), `id: market_square
title: "@journal.market_square.title"
text: "@journal.market_square.text"
category: places
`)

  // --- content/interludes ---
  await writeFile(join(projectPath, 'content/interludes/chapter_one.yaml'), `id: chapter_one
# Background image shown fullscreen during the interlude.
# Replace with your own image in assets/images/.
background: /assets/images/banners/tavern_banner.jpg

# Optional: decorative border/frame image overlaid on the background.
# banner: /assets/images/ui/chapter_frame.png

# Optional: music to play during this interlude.
# music: /assets/audio/music/chapter_theme.ogg

# The narrative text. Supports @localization.key or plain text.
text: |
  Chapter One: A New Beginning

  The road behind you stretches long and empty.
  Ahead, the lights of town flicker through the evening mist.

  You have heard the rumours. Strange things happening.
  People going missing. Shadows that move wrong.

  Someone has to look into it.

  It might as well be you.

# Auto-trigger when the player enters the tavern for the first time.
# triggerConditions prevents re-triggering. effects runs when the interlude fires
# — setFlag here marks it seen so it won't show again on return visits.
triggerLocation: tavern
triggerConditions:
  - type: notFlag
    flag: seenChapterOne
effects:
  - type: setFlag
    flag: seenChapterOne
`)

  // --- content/dialogues/tavern_intro.dlg ---
  // Triggered narrator intro on first visit to tavern
  await writeFile(join(projectPath, 'content/dialogues/tavern_intro.dlg'), `# This dialogue triggers automatically when the player enters the tavern.
# TRIGGER <locationId> fires on arrival. REQUIRE conditions guard the trigger.
# Use notFlag to make it a one-time intro.

TRIGGER tavern
REQUIRE notFlag seenTavernIntro

# Each NODE is a conversation point. The first NODE is always the start.
NODE start
  # NARRATOR: has no speaker — used for scene-setting text.
  # @narrator.tavern_intro is a localization key defined in content/locales/en.yaml.
  # You can also write text inline: NARRATOR: "The tavern is warm and smells of ale."
  NARRATOR: @narrator.tavern_intro

  # Effects run immediately when this node is reached, before choices are shown.
  SET flag seenTavernIntro

  # CHOICE text can use a @key or "inline text".
  # A choice with END dialogue is a terminal choice — no GOTO needed.
  CHOICE @narrator.choice.look_around
    END dialogue
  END
`)

  // --- content/dialogues/market_intro.dlg ---
  // Triggered narrator intro on first visit to market
  await writeFile(join(projectPath, 'content/dialogues/market_intro.dlg'), `# One-time narrator intro for the market. Same pattern as tavern_intro.dlg.

TRIGGER market
REQUIRE notFlag seenMarketIntro

NODE start
  NARRATOR: @narrator.market_intro
  SET flag seenMarketIntro

  # ADD journalEntry unlocks a journal entry for the player.
  ADD journalEntry market_square

  CHOICE @narrator.choice.look_around
    END dialogue
  END
`)

  // --- content/dialogues/bartender_greeting.dlg ---
  await writeFile(join(projectPath, 'content/dialogues/bartender_greeting.dlg'), `# This dialogue is triggered by clicking the bartender character.
# SPEAKER: lines set who's talking — matched to character ID (case-insensitive).
# Nodes can have multiple CHOICE blocks; REQUIRE hides a choice if the condition fails.

NODE start
  BARTENDER: @bartender.greeting

  # Always available — ask for rumors (demonstrates: flag, relationship, journalEntry)
  CHOICE @bartender.choice.whats_news
    SET flag metBartender
    ADD relationship bartender 1
    GOTO rumors
  END

  # Always available — buy a drink (demonstrates: variable change, flag)
  CHOICE @bartender.choice.order_drink
    GOTO order_drink
  END

  # Only before accepting the quest (demonstrates: notFlag condition)
  CHOICE @bartender.choice.looking_for_work
    REQUIRE notFlag acceptedOddJobs
    GOTO work_intro
  END

  # Only while quest is active at "started" stage (demonstrates: questAtStage condition)
  CHOICE @bartender.choice.about_that_job
    REQUIRE questAtStage odd_jobs started
    GOTO work_followup
  END

  # Only after quest is complete (demonstrates: questAtStage condition)
  CHOICE @bartender.choice.thanks_for_work
    REQUIRE questAtStage odd_jobs complete
    GOTO work_done
  END

  CHOICE @bartender.choice.nevermind
    GOTO farewell
  END

NODE rumors
  BARTENDER: @bartender.rumors
  ADD journalEntry tavern_discovery
  ADD item old_coin
  NOTIFY @notification.journal_updated

  CHOICE @bartender.choice.tell_me_more
    GOTO rumors_detail
  END

  CHOICE @bartender.choice.back_to_chat
    GOTO start
  END

NODE rumors_detail
  BARTENDER: @bartender.rumors_detail

  CHOICE @bartender.choice.interesting
    GOTO start
  END

NODE order_drink
  BARTENDER: @bartender.order_drink

  # Only if player can afford it (demonstrates: variableGreaterThan condition)
  CHOICE @bartender.choice.sure_pay
    REQUIRE variableGreaterThan gold 4
    ADD variable gold -5
    ADD variable _drinksBought 1
    ADD variable reputation 1
    SET flag hadDrink
    ADD relationship bartender 1
    NOTIFY @notification.bought_drink
    GOTO after_drink
  END

  # Always available as an out
  CHOICE @bartender.choice.too_rich
    GOTO start
  END

NODE after_drink
  BARTENDER: @bartender.after_drink

  CHOICE @bartender.choice.back_to_chat
    GOTO start
  END

NODE work_intro
  BARTENDER: @bartender.work_intro

  CHOICE @bartender.choice.accept_work
    SET flag acceptedOddJobs
    SET questStage odd_jobs started
    ADD journalEntry odd_jobs_accepted
    ADD relationship bartender 2
    ADD variable reputation 5
    NOTIFY @notification.quest_started
    GOTO work_accepted
  END

  CHOICE @bartender.choice.not_interested
    GOTO start
  END

NODE work_accepted
  BARTENDER: @bartender.work_accepted

  CHOICE @bartender.choice.on_my_way
    GOTO farewell
  END

  CHOICE @bartender.choice.more_details
    GOTO work_details
  END

NODE work_details
  BARTENDER: @bartender.work_details

  CHOICE @bartender.choice.got_it
    GOTO farewell
  END

NODE work_followup
  BARTENDER: @bartender.work_followup

  CHOICE @bartender.choice.on_my_way
    GOTO farewell
  END

NODE work_done
  BARTENDER: @bartender.work_done
  ADD relationship bartender 3

  CHOICE @bartender.choice.anytime
    GOTO start
  END

NODE farewell
  BARTENDER: @bartender.farewell
  END dialogue
`)

  // --- content/dialogues/merchant_intro.dlg ---
  await writeFile(join(projectPath, 'content/dialogues/merchant_intro.dlg'), `# Merchant dialogue. Same speaker-line and CHOICE syntax as bartender_greeting.dlg.
# The quest choices here demonstrate multi-stage quest gating with questAtStage.

NODE start
  MERCHANT: @merchant.greeting

  CHOICE @merchant.choice.browse_wares
    GOTO browse
  END

  # Only appears when quest is at "started" (bartender sent you)
  CHOICE @merchant.choice.heard_about_work
    REQUIRE questAtStage odd_jobs started
    GOTO odd_jobs_talk
  END

  # Only appears after talking to merchant about the job
  CHOICE @merchant.choice.delivery_done
    REQUIRE questAtStage odd_jobs talked_to_merchant
    GOTO quest_complete
  END

  CHOICE @merchant.choice.whats_this_place
    GOTO about_market
  END

  CHOICE @merchant.choice.goodbye
    GOTO farewell
  END

NODE browse
  MERCHANT: @merchant.browse

  # Conditional purchase — need enough gold (demonstrates: variableGreaterThan)
  CHOICE @merchant.choice.buy_map
    REQUIRE variableGreaterThan gold 19
    ADD variable gold -20
    SET flag boughtMap
    NOTIFY @notification.bought_map
    GOTO sold_map
  END

  CHOICE @merchant.choice.too_pricey
    GOTO too_pricey
  END

NODE sold_map
  MERCHANT: @merchant.sold_map

  CHOICE @merchant.choice.thanks_info
    GOTO start
  END

NODE too_pricey
  MERCHANT: @merchant.too_pricey

  CHOICE @merchant.choice.back_to_browse
    GOTO start
  END

NODE odd_jobs_talk
  MERCHANT: @merchant.odd_jobs

  CHOICE @merchant.choice.accept_task
    SET questStage odd_jobs talked_to_merchant
    ADD relationship merchant 1
    NOTIFY @notification.quest_updated
    GOTO task_details
  END

  CHOICE @merchant.choice.need_to_think
    GOTO farewell
  END

NODE task_details
  MERCHANT: @merchant.task_details

  CHOICE @merchant.choice.on_it
    GOTO farewell
  END

NODE quest_complete
  MERCHANT: @merchant.quest_complete
  SET questStage odd_jobs complete
  ADD variable gold 50
  ADD variable reputation 10
  ADD relationship merchant 3
  NOTIFY @notification.quest_complete

  CHOICE @merchant.choice.glad_to_help
    GOTO farewell
  END

NODE about_market
  MERCHANT: @merchant.about_market

  CHOICE @merchant.choice.thanks_info
    GOTO start
  END

NODE farewell
  MERCHANT: @merchant.farewell
  END dialogue
`)

  // --- content/dialogues/bluff_check.dlg ---
  // Demonstrates dice rolling: ROLL effect, {varName} interpolation, and roll condition
  await writeFile(join(projectPath, 'content/dialogues/bluff_check.dlg'), `# Skill check example — demonstrates dice rolling and variable interpolation.
#
# ROLL <variable> <min> <max>  — rolls a random integer and stores it in a variable.
# {varName}                    — in dialogue text, replaced with the variable's value.
# roll <min> <max> <threshold> — condition: rolls and returns true if result >= threshold.
#
# This dialogue is NOT auto-triggered — start it from another node with:
#   START dialogue bluff_check

NODE start
  # Roll a d20 and store it as "bluffRoll" before the player sees the result
  ROLL bluffRoll 1 20
  NARRATOR: @bluff.setup

  CHOICE @bluff.choice.attempt
    GOTO resolve
  END

  CHOICE @bluff.choice.back_down
    NARRATOR: @bluff.backed_down
    END dialogue
  END

NODE resolve
  # Show the roll result using {bluffRoll} interpolation in the locale string
  NARRATOR: @bluff.rolled

  # Branch on whether the stored variable passes a threshold (15+)
  IF variableGreaterThan bluffRoll 14
    GOTO success
  END

  GOTO failure

NODE success
  NARRATOR: @bluff.success
  ADD relationship bartender 2
  SET flag bluffedMarcus
  END dialogue

NODE failure
  NARRATOR: @bluff.failure
  END dialogue
`)

  // --- content/locales/en.yaml ---
  await writeFile(join(projectPath, 'content/locales/en.yaml'), `# ===================
# Narrator Intros
# ===================
narrator.tavern_intro: "You push open the heavy oak door and step inside. The warmth hits you first, then the smell — stale ale, wood smoke, and something frying in the kitchen. A few patrons hunch over their mugs. Behind the bar, a broad-shouldered man wipes down glasses, watching you with quiet interest."
narrator.market_intro: "The market square opens up before you, a riot of color and noise. Stalls line every side, draped in bright awnings. Merchants call out their prices, children dart between carts, and somewhere a street musician plays an out-of-tune fiddle."
narrator.choice.look_around: "Look around."

# ===================
# Locations
# ===================
location.tavern.name: "The Salty Dog"
location.tavern.description: "A dimly lit tavern smelling of salt and stale ale. Candles flicker on rough wooden tables, and the murmur of conversation fills the air."
location.market.name: "Market Square"
location.market.description: "A bustling open-air market where merchants hawk their wares. The smell of fresh bread mingles with exotic spices."

# ===================
# Characters
# ===================
character.bartender.name: "Marcus the Bartender"
character.bartender.bio: "A gruff man with kind eyes who's heard every story twice. He keeps the peace at The Salty Dog with a firm hand and a generous pour."
character.merchant.name: "Elena the Merchant"
character.merchant.bio: "A sharp-eyed trader who always seems to know the value of everything, and the price of everyone."

# ===================
# Items
# ===================
item.old_coin.name: "Old Coin"
item.old_coin.description: "A tarnished coin with strange markings. It doesn't match any currency you've seen before."

# ===================
# Maps
# ===================
map.town.name: "Town"

# ===================
# Quests
# ===================
quest.odd_jobs.name: "Odd Jobs"
quest.odd_jobs.description: "The bartender mentioned someone at the market who could use a hand."
quest.odd_jobs.stage.started: "Marcus mentioned work at the market. I should talk to the merchant there."
quest.odd_jobs.stage.talked_to_merchant: "Elena needs a delivery watched. Time to head to the docks."
quest.odd_jobs.stage.complete: "Job well done. Elena paid 50 gold for the trouble."

# ===================
# Journal Entries
# ===================
journal.tavern_discovery.title: "The Salty Dog"
journal.tavern_discovery.text: "I found a tavern in the docks district called The Salty Dog. The bartender, Marcus, seems well-connected. Word is there's been strange folk around the docks at night."
journal.odd_jobs_accepted.title: "Work at the Market"
journal.odd_jobs_accepted.text: "Marcus pointed me toward a merchant in the market square — Elena. She's looking for someone reliable. Should head over and introduce myself."
journal.market_square.title: "Market Square"
journal.market_square.text: "The market square is the heart of this little town. Elena has been trading here for fifteen years. A good place to resupply."

# ===================
# Bartender Dialogue
# ===================
bartender.greeting: "Welcome to the Salty Dog, stranger. What can I get you?"
bartender.farewell: "Take care out there. The streets aren't as safe as they used to be."

# Choices
bartender.choice.whats_news: "What's the news around here?"
bartender.choice.order_drink: "I'll have a drink."
bartender.choice.looking_for_work: "I'm looking for work."
bartender.choice.about_that_job: "About that job you mentioned..."
bartender.choice.thanks_for_work: "Thanks for putting me onto that work."
bartender.choice.nevermind: "Never mind, just passing through."
bartender.choice.tell_me_more: "Tell me more about that."
bartender.choice.interesting: "Interesting. I'll keep that in mind."
bartender.choice.sure_pay: "Sure, here's five gold."
bartender.choice.too_rich: "On second thought, I'll pass."
bartender.choice.back_to_chat: "So, what else?"
bartender.choice.accept_work: "Sure, I could use the coin."
bartender.choice.not_interested: "Not right now, thanks."
bartender.choice.on_my_way: "I'll head there now."
bartender.choice.more_details: "What exactly do they need?"
bartender.choice.got_it: "Got it. I'll take care of it."
bartender.choice.anytime: "Anytime."

# Responses
bartender.rumors: "Word is there's been strange folk poking around the docks at night. And the merchant in the market square has been looking for hired help. Oh — found this on the floor the other day. Strange markings. You can have it."
bartender.rumors_detail: "Some say they've seen lights out on the old pier after midnight. Probably smugglers, but who knows these days. Keep your wits about you."
bartender.order_drink: "Five gold for the house special — strongest thing this side of the river. What do you say?"
bartender.after_drink: "Glad you like it! Brewed it myself. Now then, anything else?"
bartender.work_intro: "Well now, you look capable enough. There's a merchant over in the market square — Elena — she's been asking around for someone reliable. Tell her Marcus sent you."
bartender.work_accepted: "Good on you. Elena's fair with pay. Head to the market square when you're ready."
bartender.work_details: "Something about a shipment that needs escorting. Nothing too dangerous, she says — but then, that's what they always say."
bartender.work_followup: "Still working on that job for Elena? She's over at the market square if you haven't found her yet. Don't keep her waiting too long."
bartender.work_done: "I heard Elena's singing your praises. Good work out there — I knew you had it in you."

# ===================
# Merchant Dialogue
# ===================
merchant.greeting: "Welcome, welcome! Elena's Emporium has everything you need, and plenty you didn't know you wanted."
merchant.farewell: "Safe travels! Come back anytime."

# Choices
merchant.choice.browse_wares: "Let me see what you've got."
merchant.choice.heard_about_work: "Marcus sent me about some work."
merchant.choice.delivery_done: "The delivery is done."
merchant.choice.whats_this_place: "Tell me about the market."
merchant.choice.goodbye: "Just browsing. Goodbye."
merchant.choice.buy_map: "I'll take the map. (20 gold)"
merchant.choice.too_pricey: "A bit rich for my blood."
merchant.choice.accept_task: "I'm in. What do you need?"
merchant.choice.need_to_think: "Let me think about it."
merchant.choice.thanks_info: "Thanks for the info."
merchant.choice.back_to_browse: "I'll keep looking around."
merchant.choice.on_it: "Consider it done."
merchant.choice.glad_to_help: "Glad I could help."

# Responses
merchant.browse: "Take a look! I've got a fine map of the area if you're new around here. Only twenty gold — a bargain for not getting lost."
merchant.sold_map: "Excellent choice! This'll keep you from wandering into the wrong part of town."
merchant.too_pricey: "Ha! You'd pay twice that if you got lost in the docks at night. But no rush — I'll be here."
merchant.odd_jobs: "Ah, Marcus sent you? Good man. I've got a shipment coming in and could use someone to keep an eye on things. Interested?"
merchant.task_details: "Head down to the docks at sundown. You'll meet my contact there — a woman named Ria. Make sure the cargo gets here in one piece."
merchant.quest_complete: "Everything arrived in perfect condition! You've earned this — fifty gold, as promised. If I need help again, you'll be the first I call."
merchant.about_market: "Market Square is the heart of this little town. You can find just about anything here if you know where to look. I've been trading here for fifteen years."

# ===================
# Notifications
# ===================
notification.journal_updated: "Journal Updated"
notification.quest_started: "New Quest: Odd Jobs"
notification.quest_updated: "Quest Updated: Odd Jobs"
notification.quest_complete: "Quest Complete: Odd Jobs (+50 gold, +10 reputation)"
notification.bought_drink: "Bought a drink (-5 gold)"
notification.bought_map: "Bought a map (-20 gold)"

# ===================
# Skill Check (bluff_check.dlg)
# ===================
bluff.setup: "Marcus eyes you across the bar. You consider spinning him a tale to get a discount on that drink..."
bluff.choice.attempt: "Try to bluff him."
bluff.choice.back_down: "Actually, never mind."
bluff.backed_down: "Some fights aren't worth picking."
bluff.rolled: "You spin the tale with {bluffRoll} on your roll — and Marcus listens carefully."
bluff.success: "The story lands perfectly. Marcus laughs and slides a free drink across the bar. \"That's a good one,\" he admits."
bluff.failure: "Marcus raises an eyebrow. \"Nice try,\" he says, entirely unconvinced. \"That'll be five gold.\""
`)

  console.log(crayon.green(`  ${check} Starter content created`))
  console.log('')
  console.log(crayon.dim('  Content includes:'))
  console.log(crayon.dim('    2 locations  (tavern, market)'))
  console.log(crayon.dim('    2 characters (bartender, merchant)'))
  console.log(crayon.dim('    1 item       (old coin)'))
  console.log(crayon.dim('    1 map        (town with 2 locations)'))
  console.log(crayon.dim('    1 quest      (odd jobs, 3 stages)'))
  console.log(crayon.dim('    3 journal entries'))
  console.log(crayon.dim('    1 interlude  (chapter one, auto-triggers at tavern)'))
  console.log(crayon.dim('    5 dialogues  (2 narrator intros, 2 NPC conversations, 1 skill check)'))
  console.log(crayon.dim('    English locale with all strings'))

  // --- .gitignore ---
  await writeFile(join(projectPath, '.gitignore'), `node_modules
dist
.DS_Store
*.log
`)
}

