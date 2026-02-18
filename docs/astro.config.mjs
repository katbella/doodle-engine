import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  base: "/",
  integrations: [
    starlight({
      title: "Doodle Engine",
      description: "A narrative RPG engine for text-based story-driven games.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/katbella/doodle-engine",
        },
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Installation", slug: "getting-started/installation" },
            {
              label: "Your First Game",
              slug: "getting-started/your-first-game",
            },
            {
              label: "Project Structure",
              slug: "getting-started/project-structure",
            },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Writing Dialogues", slug: "guides/writing-dialogues" },
            { label: "Creating Quests", slug: "guides/creating-quests" },
            { label: "Adding Locations", slug: "guides/adding-locations" },
            {
              label: "Characters & Party",
              slug: "guides/characters-and-party",
            },
            { label: "Inventory & Items", slug: "guides/inventory-and-items" },
            { label: "Interludes", slug: "guides/interludes" },
            { label: "Dice & Randomness", slug: "guides/dice-and-randomness" },
            { label: "Localization", slug: "guides/localization" },
            { label: "Save & Load", slug: "guides/save-and-load" },
            { label: "Game Shell", slug: "guides/game-shell" },
            { label: "Audio", slug: "guides/audio" },
            { label: "Video & Cutscenes", slug: "guides/video-cutscenes" },
            { label: "Assets & Media", slug: "guides/assets-and-media" },
            { label: "Asset Loading", slug: "guides/asset-loading" },
            { label: "Content Validation", slug: "guides/content-validation" },
            {
              label: "Debugging with DevTools",
              slug: "guides/debugging-with-devtools",
            },
            {
              label: "Hosting & Deployment",
              slug: "guides/hosting-and-deployment",
            },
            {
              label: "Extending the Engine",
              slug: "guides/extending-the-engine",
            },
            { label: "Custom Renderer", slug: "guides/custom-renderer" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Engine API", slug: "reference/engine-api" },
            { label: "Conditions", slug: "reference/conditions" },
            { label: "Effects", slug: "reference/effects" },
            { label: "DSL Syntax", slug: "reference/dsl-syntax" },
            { label: "YAML Schemas", slug: "reference/yaml-schemas" },
            { label: "React Components", slug: "reference/react-components" },
            { label: "React Hooks", slug: "reference/react-hooks" },
            { label: "Asset Manifest", slug: "reference/asset-manifest" },
            { label: "CLI Commands", slug: "reference/cli-commands" },
          ],
        },
        {
          label: "Concepts",
          items: [
            { label: "Architecture", slug: "concepts/architecture" },
            { label: "Content Registry", slug: "concepts/content-registry" },
            { label: "Variable Naming", slug: "concepts/variable-naming" },
            { label: "Why Doodle Engine", slug: "concepts/why-doodle-engine" },
          ],
        },
      ],
    }),
  ],
});
