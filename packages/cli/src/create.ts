/**
 * doodle create
 *
 * Scaffolds a new Doodle Engine game project
 */

import prompts from 'prompts'
import { mkdir, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { crayon } from 'crayon.js'

const paw = '🐾'
const dog = '🐕'
const bone = '🦴'
const sparkle = '✨'
const folder = '📁'
const check = '✅'
const rocket = '🚀'

// Vite inlines all template files as strings at build time.
// Keys are relative paths like './templates/content/game.yaml'.
const TEMPLATES = import.meta.glob('./templates/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/**
 * Maps a template glob key to its output path relative to the project root.
 * Returns null for files that need special handling (App variants).
 */
function resolveOutputPath(key: string): string | null {
  // Strip the './templates/' prefix
  const rel = key.replace('./templates/', '')

  // App variant files are picked separately — skip in main loop
  if (rel === 'src/App.default.tsx' || rel === 'src/App.custom.tsx') return null

  // _root/ files go to the project root
  if (rel.startsWith('_root/')) {
    const filename = rel.slice('_root/'.length)
    // _gitignore → .gitignore  (leading _ becomes .)
    return filename.startsWith('_') ? '.' + filename.slice(1) : filename
  }

  return rel
}

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

  // --- package.json (generated — needs projectName) ---
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
  await writeFile(join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2))

  // --- Write all template files ---
  for (const [key, content] of Object.entries(TEMPLATES)) {
    const outPath = resolveOutputPath(key)
    if (outPath === null) continue

    const dest = join(projectPath, outPath)
    // Ensure parent directory exists (templates may have paths not in the dirs list)
    await mkdir(dirname(dest), { recursive: true })
    await writeFile(dest, content)
  }

  // --- src/App.tsx (pick variant based on renderer choice) ---
  const appKey = useDefaultRenderer
    ? './templates/src/App.default.tsx'
    : './templates/src/App.custom.tsx'
  await writeFile(join(projectPath, 'src/App.tsx'), TEMPLATES[appKey])

  console.log(crayon.green(`  ${check} Source files created`))
  console.log('')

  console.log(`  ${bone} ${crayon.bold('Starter content written')}`)
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
}
