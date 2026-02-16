/**
 * Doodle Engine CLI
 *
 * Main command-line interface for Doodle Engine development
 */

import { Command } from 'commander'
import { crayon } from 'crayon.js'
import { dev } from './commands/dev.js'
import { build } from './commands/build.js'

const program = new Command()

program
  .name('doodle')
  .description(crayon.magenta('🐾 Doodle Engine') + crayon.dim(' — Narrative RPG development tools'))
  .version('0.0.1')

program
  .command('dev')
  .description('Start development server with hot reload')
  .action(async () => {
    await dev()
  })

program
  .command('build')
  .description('Build game for production')
  .action(async () => {
    await build()
  })

program.parse()
