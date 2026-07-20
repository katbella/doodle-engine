/**
 * A project reference index: for every id, where it is used.
 *
 * The registry answers "what is entity X"; this answers "what uses X". It walks
 * the parsed registry once and records each usage with the file it lives in, so
 * Studio can show find-references, warn before a delete, and find orphans.
 *
 * References are found structurally (entity fields, node speakers, and the id
 * arguments of conditions/effects, which are typed by the engine's descriptors)
 * — never by scanning prose, so display text is never mistaken for a reference.
 */

import {
    conditionDescriptor,
    effectDescriptor,
    REFERENCE_KIND_TARGET,
} from './parser/descriptors';
import type { Condition } from './types/conditions';
import type { Effect } from './types/effects';
import type { Dialogue, GameConfig } from './types/entities';
import type { ContentRegistry } from './types/registry';

/** The kinds of symbol the index tracks. */
export type SymbolType =
    | 'characters'
    | 'items'
    | 'locations'
    | 'quests'
    | 'dialogues'
    | 'interludes'
    | 'journalEntries'
    | 'flags'
    | 'variables';

/** One place a symbol is used. */
export interface Reference {
    /** File path (relative to the project) the usage is in, if known. */
    file: string | null;
    /** Human-readable description of the usage site. */
    where: string;
}

/** Map from reference kind to registry collection, plus flags/variables. */
const KIND_TO_TYPE: Record<string, SymbolType> = {
    itemId: 'items',
    characterId: 'characters',
    locationId: 'locations',
    questId: 'quests',
    journalId: 'journalEntries',
    dialogueId: 'dialogues',
    interludeId: 'interludes',
    flag: 'flags',
    variable: 'variables',
};

function key(type: SymbolType, id: string): string {
    return `${type}:${id}`;
}

export class ReferenceIndex {
    /** Usages by symbol key. */
    private readonly refs = new Map<string, Reference[]>();
    /** True for every defined symbol key (to find orphans). */
    private readonly defined = new Map<string, SymbolType>();

    /**
     * @param fileMap - Source file per entity, keyed "<collection>:<id>"
     * (the shape the toolkit loader returns).
     */
    constructor(
        private readonly registry: ContentRegistry,
        private readonly fileMap: Map<string, string>,
        config?: GameConfig
    ) {
        this.build(config);
    }

    /** Every place the given symbol is used. */
    find(type: SymbolType, id: string): Reference[] {
        return this.refs.get(key(type, id)) ?? [];
    }

    /** How many places use the given symbol. */
    count(type: SymbolType, id: string): number {
        return this.find(type, id).length;
    }

    /** Every id of the given type seen anywhere (referenced or defined), sorted.
     * For flags/variables, which have no declaration, this is every key used. */
    allSymbols(type: SymbolType): string[] {
        const ids = new Set<string>();
        const prefix = `${type}:`;
        for (const k of this.refs.keys())
            if (k.startsWith(prefix)) ids.add(k.slice(prefix.length));
        for (const [k, t] of this.defined)
            if (t === type) ids.add(k.slice(prefix.length));
        return [...ids].sort();
    }

    /** Defined entities of the given type that nothing references. */
    orphans(type: SymbolType): string[] {
        const out: string[] = [];
        for (const [k, t] of this.defined) {
            if (t !== type) continue;
            const id = k.slice(t.length + 1);
            if (this.count(type, id) === 0) out.push(id);
        }
        return out.sort();
    }

    private fileFor(collection: string, id: string): string | null {
        return this.fileMap.get(`${collection}:${id}`) ?? null;
    }

    private add(type: SymbolType, id: string, ref: Reference) {
        if (!id) return;
        const k = key(type, id);
        const list = this.refs.get(k);
        if (list) list.push(ref);
        else this.refs.set(k, [ref]);
    }

    private define(type: SymbolType, id: string) {
        this.defined.set(key(type, id), type);
    }

    private build(config?: GameConfig) {
        const r = this.registry;

        // Record defined entities so orphan detection knows what exists.
        (
            [
                'characters',
                'items',
                'locations',
                'quests',
                'dialogues',
                'interludes',
                'journalEntries',
            ] as const
        ).forEach((type) => {
            for (const id of Object.keys(r[type])) this.define(type, id);
        });

        // Character fields.
        for (const c of Object.values(r.characters)) {
            const file = this.fileFor('characters', c.id);
            if (c.location)
                this.add('locations', c.location, {
                    file,
                    where: `character "${c.id}" location`,
                });
            if (c.dialogue)
                this.add('dialogues', c.dialogue, {
                    file,
                    where: `character "${c.id}" dialogue`,
                });
        }

        // Item fields.
        for (const item of Object.values(r.items)) {
            const file = this.fileFor('items', item.id);
            if (item.location && item.location !== 'inventory') {
                // A container is a location or a character; record under both,
                // whichever the id actually names.
                if (r.locations[item.location])
                    this.add('locations', item.location, {
                        file,
                        where: `item "${item.id}" location`,
                    });
                if (r.characters[item.location])
                    this.add('characters', item.location, {
                        file,
                        where: `item "${item.id}" location`,
                    });
            }
        }

        // Map markers reference locations.
        for (const map of Object.values(r.maps)) {
            const file = this.fileFor('maps', map.id);
            for (const marker of map.locations)
                this.add('locations', marker.id, {
                    file,
                    where: `map "${map.id}" marker`,
                });
        }

        // Dialogue references (trigger, speaker, condition/effect args).
        for (const dialogue of Object.values(r.dialogues)) {
            this.indexDialogue(dialogue);
        }

        // Interlude trigger location, trigger conditions, and effects.
        for (const interlude of Object.values(r.interludes)) {
            const file = this.fileFor('interludes', interlude.id);
            if (interlude.triggerLocation)
                this.add('locations', interlude.triggerLocation, {
                    file,
                    where: `interlude "${interlude.id}" trigger`,
                });
            for (const condition of interlude.triggerConditions ?? [])
                this.indexCondition(
                    condition,
                    file,
                    `interlude "${interlude.id}" trigger condition`
                );
            for (const effect of interlude.effects ?? [])
                this.indexEffect(effect, file, `interlude "${interlude.id}"`);
        }

        // Game config references.
        if (config) {
            const file = 'content/game.yaml';
            if (config.startLocation)
                this.add('locations', config.startLocation, {
                    file,
                    where: 'game config start location',
                });
            for (const itemId of config.startInventory ?? [])
                this.add('items', itemId, {
                    file,
                    where: 'game config start inventory',
                });
            for (const flag of Object.keys(config.startFlags ?? {}))
                this.add('flags', flag, {
                    file,
                    where: 'game config start flags',
                });
            for (const variable of Object.keys(config.startVariables ?? {}))
                this.add('variables', variable, {
                    file,
                    where: 'game config start variables',
                });
        }
    }

    private indexDialogue(dialogue: Dialogue) {
        const file = this.fileFor('dialogues', dialogue.id);
        const at = `dialogue "${dialogue.id}"`;

        if (dialogue.triggerLocation)
            this.add('locations', dialogue.triggerLocation, {
                file,
                where: `${at} trigger`,
            });

        // Top-level REQUIRE lines gate the whole dialogue.
        for (const condition of dialogue.conditions ?? [])
            this.indexCondition(condition, file, `${at} requirement`);

        for (const node of dialogue.nodes) {
            if (node.speaker)
                this.add('characters', node.speaker, {
                    file,
                    where: `${at} node "${node.id}" speaker`,
                });
            const site = `${at} node "${node.id}"`;
            for (const c of node.conditions ?? [])
                this.indexCondition(c, file, site);
            for (const e of node.effects ?? []) this.indexEffect(e, file, site);
            for (const branch of node.conditionalBranches ?? []) {
                this.indexCondition(branch.condition, file, site);
                for (const e of branch.effects ?? [])
                    this.indexEffect(e, file, site);
            }
            for (const choice of node.choices) {
                for (const c of choice.conditions ?? [])
                    this.indexCondition(c, file, site);
                for (const e of choice.effects ?? [])
                    this.indexEffect(e, file, site);
            }
        }
    }

    private indexArgs(
        entity: Condition | Effect,
        args: { name: string; kind: string }[],
        file: string | null,
        where: string
    ) {
        const record = entity as unknown as Record<string, unknown>;
        for (const arg of args) {
            const type =
                KIND_TO_TYPE[arg.kind] ??
                (REFERENCE_KIND_TARGET[arg.kind as never] as
                    | SymbolType
                    | undefined);
            if (!type) continue;
            const value = record[arg.name];
            if (typeof value === 'string' && value)
                this.add(type, value, { file, where });
        }
    }

    private indexCondition(
        condition: Condition,
        file: string | null,
        where: string
    ) {
        this.indexArgs(
            condition,
            conditionDescriptor(condition.type).args,
            file,
            where
        );
    }

    private indexEffect(effect: Effect, file: string | null, where: string) {
        this.indexArgs(
            effect,
            effectDescriptor(effect.type).args,
            file,
            where
        );
    }
}
