/**
 * How to draw a form for each YAML entity type.
 *
 * This is Studio presentation only: labels, which control a field uses, which
 * fields point at another piece of content (a picker) or an asset file. The
 * engine, the CLI, and the renderer never read this — a developer who hand-edits
 * YAML and runs the CLI is unaffected. It lives in Studio for exactly that
 * reason; core stays free of editor concerns.
 *
 * The field list mirrors the entity types in @doodle-engine/core. Required vs.
 * optional matches those types. Any key in the file that is NOT listed here is
 * still shown (read-only) and saved untouched, so unknown/extension fields and
 * the open `stats` bag are never lost.
 */

import type { AssetCategory } from '@doodle-engine/core';
import type { SectionKey } from '../types';

/** The registry collection a reference field points at. */
export type RefTarget =
    | 'locations'
    | 'characters'
    | 'items'
    | 'dialogues'
    | 'quests'
    | 'interludes'
    | 'journalEntries';

/** The control a field uses in the form. */
export type FieldControl =
    | { kind: 'text' }
    | { kind: 'textarea' }
    | { kind: 'number' }
    | { kind: 'boolean' }
    /** A @key/literal text field backed by the locale files. */
    | { kind: 'localizable' }
    /** A dropdown of ids from a registry collection. */
    | { kind: 'reference'; target: RefTarget }
    /** An asset filename with a category (for validation and preview). */
    | { kind: 'asset'; category: AssetCategory }
    /** The open key/value bag (`stats`). */
    | { kind: 'statsBag' }
    /** A list of asset filenames (interlude `sounds`). */
    | { kind: 'assetList'; category: AssetCategory };

export interface FieldDescriptor {
    /** The YAML key. */
    name: string;
    /** Label shown above the control. */
    label: string;
    control: FieldControl;
    /** Writing shape for textual controls. Prose wraps and grows vertically. */
    textKind?: 'identifier' | 'short' | 'prose';
    /** Required fields are marked inline; missing them is a form error. */
    required?: boolean;
    /** Short hint shown under the label. */
    hint?: string;
}

/** The form for one entity type: an ordered list of fields. `id` is handled
 * separately (it's the filename/identity, shown read-only at the top). */
export interface EntityForm {
    /** Singular label, e.g. "Character". */
    label: string;
    fields: FieldDescriptor[];
}

const character: EntityForm = {
    label: 'Character',
    fields: [
        {
            name: 'name',
            label: 'Name',
            control: { kind: 'localizable' },
            textKind: 'short',
            required: true,
        },
        {
            name: 'biography',
            label: 'Biography',
            control: { kind: 'localizable' },
            textKind: 'prose',
        },
        {
            name: 'portrait',
            label: 'Portrait',
            control: { kind: 'asset', category: 'portrait' },
        },
        {
            name: 'location',
            label: 'Starting location',
            control: { kind: 'reference', target: 'locations' },
            required: true,
        },
        {
            name: 'dialogue',
            label: 'Dialogue',
            control: { kind: 'reference', target: 'dialogues' },
        },
        { name: 'stats', label: 'Stats', control: { kind: 'statsBag' } },
    ],
};

const location: EntityForm = {
    label: 'Location',
    fields: [
        {
            name: 'name',
            label: 'Name',
            control: { kind: 'localizable' },
            textKind: 'short',
            required: true,
        },
        {
            name: 'description',
            label: 'Description',
            control: { kind: 'localizable' },
            textKind: 'prose',
        },
        {
            name: 'banner',
            label: 'Banner',
            control: { kind: 'asset', category: 'banner' },
        },
        {
            name: 'music',
            label: 'Music',
            control: { kind: 'asset', category: 'music' },
        },
        {
            name: 'ambient',
            label: 'Ambient',
            control: { kind: 'asset', category: 'ambient' },
        },
    ],
};

const item: EntityForm = {
    label: 'Item',
    fields: [
        {
            name: 'name',
            label: 'Name',
            control: { kind: 'localizable' },
            textKind: 'short',
            required: true,
        },
        {
            name: 'description',
            label: 'Description',
            control: { kind: 'localizable' },
            textKind: 'prose',
        },
        {
            name: 'icon',
            label: 'Icon',
            control: { kind: 'asset', category: 'item' },
        },
        {
            name: 'image',
            label: 'Image',
            control: { kind: 'asset', category: 'item' },
        },
        {
            name: 'location',
            label: 'Starting location',
            control: { kind: 'reference', target: 'locations' },
            hint: '“— none —” keeps the item out of play until an effect adds it.',
        },
        { name: 'stats', label: 'Stats', control: { kind: 'statsBag' } },
    ],
};

const quest: EntityForm = {
    label: 'Quest',
    fields: [
        {
            name: 'name',
            label: 'Name',
            control: { kind: 'localizable' },
            textKind: 'short',
            required: true,
        },
        {
            name: 'description',
            label: 'Description',
            control: { kind: 'localizable' },
            textKind: 'prose',
        },
        // `stages` is a list of {id, description}; the form renders it specially.
    ],
};

const map: EntityForm = {
    label: 'Map',
    fields: [
        {
            name: 'name',
            label: 'Name',
            control: { kind: 'localizable' },
            textKind: 'short',
            required: true,
        },
        {
            name: 'image',
            label: 'Image',
            control: { kind: 'asset', category: 'map' },
        },
        {
            name: 'scale',
            label: 'Scale',
            control: { kind: 'number' },
            hint: 'At scale 100, a marker 300 units away takes 3 hours to reach.',
        },
        // `locations` is a list of {id, x, y}; the form renders it specially.
    ],
};

const interlude: EntityForm = {
    label: 'Interlude',
    fields: [
        {
            name: 'background',
            label: 'Background',
            control: { kind: 'asset', category: 'banner' },
            required: true,
        },
        {
            name: 'banner',
            label: 'Banner',
            control: { kind: 'asset', category: 'banner' },
        },
        {
            name: 'music',
            label: 'Music',
            control: { kind: 'asset', category: 'music' },
        },
        {
            name: 'voice',
            label: 'Voice',
            control: { kind: 'asset', category: 'voice' },
        },
        {
            name: 'sounds',
            label: 'Sounds',
            control: { kind: 'assetList', category: 'sfx' },
        },
        {
            name: 'text',
            label: 'Text',
            control: { kind: 'localizable' },
            textKind: 'prose',
            required: true,
        },
        { name: 'scroll', label: 'Auto-scroll', control: { kind: 'boolean' } },
        {
            name: 'scrollSpeed',
            label: 'Scroll speed',
            control: { kind: 'number' },
            hint: 'Pixels per second',
        },
        {
            name: 'triggerLocation',
            label: 'Trigger at location',
            control: { kind: 'reference', target: 'locations' },
        },
    ],
};

const journal: EntityForm = {
    label: 'Journal entry',
    fields: [
        {
            name: 'title',
            label: 'Title',
            control: { kind: 'localizable' },
            textKind: 'short',
            required: true,
        },
        {
            name: 'text',
            label: 'Text',
            control: { kind: 'localizable' },
            textKind: 'prose',
        },
        {
            name: 'category',
            label: 'Category',
            control: { kind: 'text' },
            textKind: 'short',
        },
    ],
};

/** Forms by section. Sections not here (dialogues, locales, config) have their
 * own dedicated editors. */
export const ENTITY_FORMS: Partial<Record<SectionKey, EntityForm>> = {
    characters: character,
    locations: location,
    items: item,
    quests: quest,
    maps: map,
    interludes: interlude,
    journal,
};
