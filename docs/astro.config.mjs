import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
    site: 'https://doodleengine.dev',
    base: '/',
    redirects: {
        '/guides/variable-naming/': '/guides/flags-and-variables/',
        '/guides/debugging-with-devtools/': '/technical/debugging-with-devtools/',
    },
    integrations: [
        starlight({
            title: 'Doodle Engine',
            description:
                'A narrative RPG engine for text-based story-driven games.',
            favicon: '/favicon.ico',
            components: {
                Footer: './src/components/Footer.astro',
            },
            social: [
                {
                    icon: 'github',
                    label: 'GitHub',
                    href: 'https://github.com/katbella/doodle-engine',
                },
            ],
            sidebar: [
                {
                    label: 'Getting Started',
                    items: [
                        {
                            label: 'Why Doodle Engine',
                            slug: 'getting-started/why-doodle-engine',
                        },
                        {
                            label: 'Studio or CLI?',
                            slug: 'getting-started/studio-or-cli',
                        },
                        {
                            label: 'Installation',
                            slug: 'getting-started/installation',
                        },
                        {
                            label: 'Your First Game',
                            slug: 'getting-started/your-first-game',
                        },
                        {
                            label: 'Project Structure',
                            slug: 'getting-started/project-structure',
                        },
                    ],
                },
                {
                    label: 'Doodle Studio',
                    items: [
                        { label: 'Studio Overview', slug: 'studio' },
                        { label: 'Projects', slug: 'studio/projects' },
                        { label: 'The Workspace', slug: 'studio/workspace' },
                        { label: 'Themes', slug: 'studio/themes' },
                        { label: 'Dialogue Editing', slug: 'studio/dialogues' },
                        {
                            label: 'Flags & Variables',
                            slug: 'studio/flags-and-variables',
                        },
                        { label: 'Playtesting', slug: 'studio/playtesting' },
                        { label: 'Assets', slug: 'studio/assets' },
                        { label: 'Localization', slug: 'studio/localization' },
                        {
                            label: 'Validate, Preview, and Build',
                            slug: 'studio/validation-builds',
                        },
                        {
                            label: 'Updating Studio',
                            slug: 'studio/updates',
                        },
                    ],
                },
                {
                    label: 'Guides',
                    items: [
                        {
                            label: 'Story & Content',
                            items: [
                                {
                                    label: 'Writing Dialogues',
                                    slug: 'guides/writing-dialogues',
                                },
                                {
                                    label: 'VS Code Extension',
                                    slug: 'guides/vscode-extension',
                                },
                                {
                                    label: 'Adding Locations',
                                    slug: 'guides/adding-locations',
                                },
                                {
                                    label: 'Characters & Party',
                                    slug: 'guides/characters-and-party',
                                },
                                {
                                    label: 'Creating Quests',
                                    slug: 'guides/creating-quests',
                                },
                                {
                                    label: 'Journal Entries',
                                    slug: 'guides/journal-entries',
                                },
                                {
                                    label: 'Inventory & Items',
                                    slug: 'guides/inventory-and-items',
                                },
                                {
                                    label: 'Dice & Randomness',
                                    slug: 'guides/dice-and-randomness',
                                },
                                {
                                    label: 'Interludes',
                                    slug: 'guides/interludes',
                                },
                                {
                                    label: 'Player Notes',
                                    slug: 'guides/player-notes',
                                },
                                {
                                    label: 'Notifications',
                                    slug: 'guides/notifications',
                                },
                                {
                                    label: 'Flags & Variables',
                                    slug: 'guides/flags-and-variables',
                                },
                                {
                                    label: 'Localization',
                                    slug: 'guides/localization',
                                },
                            ],
                        },
                        {
                            label: 'Presentation & Media',
                            items: [
                                {
                                    label: 'Assets & Media',
                                    slug: 'guides/assets-and-media',
                                },
                                {
                                    label: 'Game Shell',
                                    slug: 'guides/game-shell',
                                },
                                { label: 'Audio', slug: 'guides/audio' },
                                {
                                    label: 'Video & Cutscenes',
                                    slug: 'guides/video-cutscenes',
                                },
                                {
                                    label: 'Customizing Doodle Engine',
                                    slug: 'guides/customizing-doodle-engine',
                                },
                            ],
                        },
                        {
                            label: 'Testing & Shipping',
                            items: [
                                {
                                    label: 'Content Validation',
                                    slug: 'guides/content-validation',
                                },
                                {
                                    label: 'Save & Load',
                                    slug: 'guides/save-and-load',
                                },
                                {
                                    label: 'Hosting & Deployment',
                                    slug: 'guides/hosting-and-deployment',
                                },
                            ],
                        },
                    ],
                },
                {
                    label: 'Technical',
                    items: [
                        {
                            label: 'Architecture',
                            slug: 'technical/architecture',
                        },
                        {
                            label: 'Content Registry',
                            slug: 'technical/content-registry',
                        },
                        {
                            label: 'Custom Renderer',
                            slug: 'technical/custom-renderer',
                        },
                        {
                            label: 'Asset Loading',
                            slug: 'technical/asset-loading',
                        },
                        {
                            label: 'Debugging with DevTools',
                            slug: 'technical/debugging-with-devtools',
                        },
                    ],
                },
                {
                    label: 'Reference',
                    items: [
                        { label: 'Glossary', slug: 'reference/glossary' },
                        { label: 'Engine API', slug: 'reference/engine-api' },
                        { label: 'Conditions', slug: 'reference/conditions' },
                        { label: 'Effects', slug: 'reference/effects' },
                        { label: 'DSL Syntax', slug: 'reference/dsl-syntax' },
                        {
                            label: 'YAML Schemas',
                            slug: 'reference/yaml-schemas',
                        },
                        {
                            label: 'React Components',
                            slug: 'reference/react-components',
                        },
                        { label: 'React Hooks', slug: 'reference/react-hooks' },
                        {
                            label: 'Asset Manifest',
                            slug: 'reference/asset-manifest',
                        },
                        { label: 'UI Strings', slug: 'reference/ui-strings' },
                        {
                            label: 'CLI Commands',
                            slug: 'reference/cli-commands',
                        },
                        {
                            label: 'Issues & Feedback',
                            slug: 'reference/reporting-issues',
                        },
                    ],
                },
            ],
        }),
    ],
});
