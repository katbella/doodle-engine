/**
 * Dev server command
 *
 * Starts a Vite dev server that:
 * - Watches content files for changes
 * - Parses .dlg and .yaml files
 * - Serves the game with hot reload
 */

import { createServer, type ViteDevServer, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { watch } from 'chokidar'
import { readFile, readdir } from 'fs/promises'
import { join, extname } from 'path'
import { parse as parseYaml } from 'yaml'
import { parseDialogue } from '@doodle-engine/core'
import { crayon } from 'crayon.js'

const paw = '🐾'
const sparkle = '✨'
const pencil = '✏️'
const plus = '➕'

export async function dev() {
  const cwd = process.cwd()
  const contentDir = join(cwd, 'content')

  console.log('')
  console.log(crayon.bold.magenta(`  ${paw} Doodle Engine Dev Server ${paw}`))
  console.log('')

  // Create content loader plugin
  const contentPlugin: Plugin = {
    name: 'doodle-content-loader',

    configureServer(server: ViteDevServer) {
      // API endpoint to load all content
      server.middlewares.use('/api/content', async (_req, res) => {
        try {
          const content = await loadAllContent(contentDir)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(content))
        } catch (error) {
          console.error(crayon.red(`  Error loading content:`), error)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Failed to load content' }))
        }
      })

      // Watch content files and trigger HMR
      const watcher = watch(join(contentDir, '**/*'), {
        ignored: /(^|[\/\\])\../,
        persistent: true,
      })

      watcher.on('change', (path) => {
        console.log(crayon.yellow(`  ${pencil} Content changed: ${path}`))
        server.ws.send({
          type: 'full-reload',
          path: '*',
        })
      })

      watcher.on('add', (path) => {
        console.log(crayon.green(`  ${plus} Content added: ${path}`))
        server.ws.send({
          type: 'full-reload',
          path: '*',
        })
      })
    },
  }

  // Create Vite server
  const server = await createServer({
    root: cwd,
    plugins: [react(), contentPlugin],
    server: {
      port: 3000,
      open: true,
    },
  })

  await server.listen()

  server.printUrls()
  console.log('')
  console.log(crayon.dim(`  ${sparkle} Watching content files for changes...`))
  console.log('')
}

/**
 * Load all content from the content directory
 */
async function loadAllContent(contentDir: string) {
  const registry: any = {
    locations: {},
    characters: {},
    items: {},
    maps: {},
    dialogues: {},
    quests: {},
    journalEntries: {},
    locales: {},
  }

  let config: any = null

  // Load each entity type (YAML files with id field)
  const entityTypes = [
    { dir: 'locations', key: 'locations' },
    { dir: 'characters', key: 'characters' },
    { dir: 'items', key: 'items' },
    { dir: 'maps', key: 'maps' },
    { dir: 'quests', key: 'quests' },
    { dir: 'journal', key: 'journalEntries' },
  ]

  for (const { dir, key } of entityTypes) {
    const dirPath = join(contentDir, dir)
    try {
      const files = await readdir(dirPath)

      for (const file of files) {
        if (extname(file) === '.yaml' || extname(file) === '.yml') {
          const filePath = join(dirPath, file)
          const content = await readFile(filePath, 'utf-8')
          const data = parseYaml(content)

          if (data && data.id) {
            registry[key][data.id] = data
          }
        }
      }
    } catch {
      // Directory might not exist, skip
    }
  }

  // Load locale files (flat key-value YAML, keyed by filename)
  try {
    const localesDir = join(contentDir, 'locales')
    const files = await readdir(localesDir)

    for (const file of files) {
      if (extname(file) === '.yaml' || extname(file) === '.yml') {
        const filePath = join(localesDir, file)
        const content = await readFile(filePath, 'utf-8')
        const data = parseYaml(content)
        const localeId = file.replace(/\.(yaml|yml)$/, '')
        registry.locales[localeId] = data ?? {}
      }
    }
  } catch {
    // Locales directory might not exist
  }

  // Load dialogues (.dlg files)
  try {
    const dialoguesDir = join(contentDir, 'dialogues')
    const files = await readdir(dialoguesDir)

    for (const file of files) {
      if (extname(file) === '.dlg') {
        const filePath = join(dialoguesDir, file)
        const content = await readFile(filePath, 'utf-8')
        const dialogueId = file.replace('.dlg', '')
        const dialogue = parseDialogue(content, dialogueId)
        registry.dialogues[dialogue.id] = dialogue
      }
    }
  } catch {
    // Dialogues directory might not exist
  }

  // Load game config
  try {
    const configPath = join(contentDir, 'game.yaml')
    const configContent = await readFile(configPath, 'utf-8')
    config = parseYaml(configContent)
  } catch {
    console.warn(crayon.yellow('  No game.yaml found, using defaults'))
    config = {
      startLocation: 'tavern',
      startTime: { day: 1, hour: 8 },
      startFlags: {},
      startVariables: {},
      startInventory: [],
    }
  }

  return { registry, config }
}
