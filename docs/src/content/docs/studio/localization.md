---
title: Localization in Studio
description: Add translation keys and another language when your game is ready.
---

Write your game’s text directly in Studio while building its first version. Add localization when you are ready to support another language.

## Move one field to a key

Open a character, location, or other content item with player-facing text. Select **@key** for the field and enter a descriptive key such as `location.tavern.name`.

[![A location using localization keys](/images/studio/localized-fields.png)](/images/studio/localized-fields.png)

Under **Locales**, open `en`, select **Source**, and add the same key with its English value:

```yaml
location.tavern.name: "The Salty Dog"
```

[![Editing the English locale](/images/studio/localization.png)](/images/studio/localization.png)

Convert one field at a time. Text written directly in Studio and fields using translation keys can exist in the same project while you work.

## Add another language

Select the **+** beside Locales and enter the language code, such as `sv`, `fr`, or `es`. Open the new locale in **Source** and add the same keys used by the English locale with their translated values.

```yaml
# content/locales/sv.yaml
location.tavern.name: "Den salta hunden"
```

The language becomes available in the game and in Studio’s playtester.

## Check the translation

Open **Playtest**, start the dialogue you want to review, and choose the language from the **Locale** selector. Read through the branch and check its choices, final lines, and any interface text it uses.

If a key has no translation, the playtester displays the key so you can find the missing entry.

See [Localization](/guides/localization/) for variables in translated text, interface strings, and renderer APIs.
