/**
 * Build command
 *
 * Builds the game into a static site
 */

import { build as viteBuild } from 'vite'
import react from '@vitejs/plugin-react'
import { join } from 'path'

export async function build() {
  const cwd = process.cwd()

  console.log('🐕🎮 Building Doodle Engine game...\n')

  try {
    await viteBuild({
      root: cwd,
      plugins: [react()],
      build: {
        outDir: 'dist',
        emptyOutDir: true,
      },
    })

    console.log('\n✅ Build complete! Output in dist/\n')
    console.log('To preview the build:')
    console.log('  yarn preview\n')
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}
