import {
    CONDITION_DESCRIPTORS,
    EFFECT_DESCRIPTORS,
    REFERENCE_KIND_TARGET,
    type ArgDescriptor,
    type ArgKind,
    type ContentRegistry,
} from '@doodle-engine/core';
import type { NameCatalog } from './flag-vars';

type Word = {
    value: string;
    start: number;
    end: number;
    kind: 'word' | 'string' | 'delimiter' | 'comment';
};

type Match = {
    kind:
        | 'condition'
        | 'effect'
        | 'gotoNode'
        | 'trigger'
        | 'node'
        | 'choice'
        | 'voice'
        | 'portrait'
        | 'end'
        | 'speaker';
    keyword: string;
    keywordWordCount: number;
    args: readonly ArgDescriptor[];
    words: Word[];
};

export type DlgArgumentKind = ArgKind | 'nodeId';

export interface DlgCursorContext {
    keyword: string | null;
    argumentIndex: number | null;
    argumentKind: DlgArgumentKind | null;
    argumentValues: string[];
}

export interface DlgCompletionContext {
    nameCatalog?: NameCatalog;
    registry?: ContentRegistry;
    nodeIds?: readonly string[];
}

export interface DlgCompletion {
    label: string;
    insertText: string;
    detail: string;
    documentation: string;
    kind: 'keyword' | 'reference' | 'value';
    replaceStartColumn: number;
}

export interface DlgHover {
    documentation: string;
    startColumn: number;
    endColumn: number;
}

export interface DlgToken {
    startIndex: number;
    scopes: string;
}

const STRUCTURAL_KEYWORDS = new Set([
    'NODE',
    'CHOICE',
    'IF',
    'END',
    'GOTO',
    'TRIGGER',
    'REQUIRE',
    'VOICE',
    'PORTRAIT',
    'NARRATOR',
]);

const STRUCTURAL_COMPLETIONS = [
    {
        label: 'NODE',
        detail: 'Start a dialogue node',
        documentation:
            '**Start a dialogue node**\n\n`NODE <nodeId>`\n\nThe first node is where the dialogue begins. A node ends automatically when the next `NODE` begins.',
    },
    {
        label: 'CHOICE',
        detail: 'Add a player choice',
        documentation:
            '**Add a player choice**\n\n`CHOICE <text>`\n\nPut its requirements, effects, and destination underneath it, then close the choice with `END`.',
    },
    {
        label: 'END',
        detail: 'Close a CHOICE or IF block',
        documentation:
            '**Close the current block**\n\n`END`\n\nCloses a `CHOICE` or `IF` block. This is different from `END dialogue`, which closes the conversation during play.',
    },
    {
        label: 'GOTO',
        detail: 'Continue at another node',
        documentation:
            '**Continue at another node**\n\n`GOTO <nodeId>`\n\nRoutes the conversation to another node. Use `GOTO location <locationId>` to end the dialogue and move the player.',
    },
    {
        label: 'TRIGGER',
        detail: 'Start when the player enters a location',
        documentation:
            '**Start this dialogue at a location**\n\n`TRIGGER <locationId>`\n\nPlace this before the first `NODE`. Top-level `REQUIRE` lines can limit when the trigger runs.',
    },
    {
        label: 'VOICE',
        detail: 'Set voice audio for this node',
        documentation:
            '**Set voice audio for this node**\n\n`VOICE <audioFile>`\n\nPlays the chosen voice file with the current node.',
    },
    {
        label: 'PORTRAIT',
        detail: 'Override the portrait for this node',
        documentation:
            '**Override the portrait for this node**\n\n`PORTRAIT <imageFile>`\n\nUses a different portrait, such as another expression, for the current node.',
    },
    {
        label: 'NARRATOR:',
        detail: 'Write a narrator line',
        documentation:
            '**Write narration with no speaker**\n\n`NARRATOR: <text>`\n\nThe text can be plain dialogue, quoted text, or an `@localization.key`.',
    },
] as const;

function lexLine(line: string): Word[] {
    const words: Word[] = [];
    let index = 0;
    while (index < line.length) {
        if (/\s/.test(line[index])) {
            index++;
            continue;
        }
        const start = index;
        if (line[index] === '#') {
            words.push({
                value: line.slice(index),
                start,
                end: line.length,
                kind: 'comment',
            });
            break;
        }
        if (line[index] === '"') {
            index++;
            while (index < line.length) {
                if (line[index] === '\\') {
                    index += 2;
                } else if (line[index++] === '"') {
                    break;
                }
            }
            words.push({
                value: line.slice(start, index),
                start,
                end: index,
                kind: 'string',
            });
            continue;
        }
        if (line[index] === ':') {
            words.push({
                value: ':',
                start,
                end: ++index,
                kind: 'delimiter',
            });
            continue;
        }
        while (
            index < line.length &&
            !/\s/.test(line[index]) &&
            line[index] !== ':' &&
            line[index] !== '#'
        ) {
            index++;
        }
        words.push({
            value: line.slice(start, index),
            start,
            end: index,
            kind: 'word',
        });
    }
    return words;
}

function startsWith(words: Word[], keyword: string): boolean {
    const parts = keyword.split(' ');
    return parts.every((part, index) => words[index]?.value === part);
}

function matchLine(line: string): Match | null {
    const lexed = lexLine(line);
    const words = lexed.filter(
        (word) => word.kind !== 'comment' && word.kind !== 'delimiter'
    );
    if (words.length === 0) return null;

    if (words[0].value === 'REQUIRE' || words[0].value === 'IF') {
        const descriptor = CONDITION_DESCRIPTORS.find(
            (item) => words[1]?.value === item.keyword
        );
        if (descriptor) {
            return {
                kind: 'condition',
                keyword: descriptor.keyword,
                keywordWordCount: 2,
                args: descriptor.args,
                words,
            };
        }
    }

    const effect = [...EFFECT_DESCRIPTORS]
        .sort(
            (left, right) =>
                right.keyword.split(' ').length - left.keyword.split(' ').length
        )
        .find((item) => startsWith(words, item.keyword));
    if (effect) {
        return {
            kind: 'effect',
            keyword: effect.keyword,
            keywordWordCount: effect.keyword.split(' ').length,
            args: effect.args,
            words,
        };
    }

    const first = words[0].value;
    if (first === 'GOTO') {
        return {
            kind: 'gotoNode',
            keyword: 'GOTO',
            keywordWordCount: 1,
            args: [{ name: 'nodeId', label: 'Node', kind: 'dialogueId' }],
            words,
        };
    }
    if (first === 'TRIGGER') {
        return {
            kind: 'trigger',
            keyword: 'TRIGGER',
            keywordWordCount: 1,
            args: [
                { name: 'locationId', label: 'Location', kind: 'locationId' },
            ],
            words,
        };
    }
    if (first === 'NODE') {
        return {
            kind: 'node',
            keyword: 'NODE',
            keywordWordCount: 1,
            args: [],
            words,
        };
    }
    if (first === 'CHOICE') {
        return {
            kind: 'choice',
            keyword: 'CHOICE',
            keywordWordCount: 1,
            args: [],
            words,
        };
    }
    if (first === 'VOICE' || first === 'PORTRAIT') {
        return {
            kind: first === 'VOICE' ? 'voice' : 'portrait',
            keyword: first,
            keywordWordCount: 1,
            args: [],
            words,
        };
    }
    if (first === 'END') {
        return {
            kind: 'end',
            keyword: 'END',
            keywordWordCount: 1,
            args: [],
            words,
        };
    }
    if (lexed.some((word) => word.kind === 'delimiter')) {
        return {
            kind: 'speaker',
            keyword: first,
            keywordWordCount: 1,
            args: [],
            words,
        };
    }
    return null;
}

function argumentIndexAt(match: Match, cursorOffset: number): number | null {
    const keywordEnd = match.words[match.keywordWordCount - 1]?.end ?? 0;
    if (cursorOffset <= keywordEnd) return null;

    if (match.kind === 'gotoNode' || match.kind === 'trigger') {
        return 0;
    }
    if (match.kind !== 'condition' && match.kind !== 'effect') {
        return null;
    }

    const argumentWords = match.words.slice(match.keywordWordCount);
    if (match.args.at(-1)?.kind === 'text') {
        const finalIndex = match.args.length - 1;
        const beforeFinal = argumentWords.slice(0, finalIndex);
        const completedBefore = beforeFinal.filter(
            (word) => word.end < cursorOffset
        ).length;
        return completedBefore >= finalIndex ? finalIndex : completedBefore;
    }

    const index = argumentWords.filter(
        (word) => word.end < cursorOffset
    ).length;
    return index < match.args.length ? index : null;
}

/**
 * Describe the command and argument under a Monaco cursor. Columns are
 * one-based, matching Monaco's Position API.
 */
export function getDlgCursorContext(
    line: string,
    column: number
): DlgCursorContext {
    const match = matchLine(line);
    if (!match) {
        return {
            keyword: null,
            argumentIndex: null,
            argumentKind: null,
            argumentValues: [],
        };
    }
    const argumentIndex = argumentIndexAt(match, Math.max(0, column - 1));
    const argumentValues = match.words
        .slice(match.keywordWordCount)
        .map((word) => word.value);
    let argumentKind: DlgArgumentKind | null = null;
    if (argumentIndex !== null) {
        argumentKind =
            match.kind === 'gotoNode'
                ? 'nodeId'
                : (match.args[argumentIndex]?.kind ?? null);
    }
    return {
        keyword: match.keyword,
        argumentIndex,
        argumentKind,
        argumentValues,
    };
}

function scopeForArgument(kind: ArgKind): string {
    if (kind === 'stageId' || kind === 'boolean' || kind === 'value') {
        return 'literal';
    }
    if (kind === 'flag' || kind === 'variable' || kind === 'stat') {
        return kind;
    }
    if (kind === 'number' || kind === 'hours') return 'number';
    if (kind === 'text') return 'string';
    return 'reference';
}

function defaultScope(word: Word): string {
    if (word.kind === 'comment') return 'comment';
    if (word.kind === 'string') return 'string';
    if (word.kind === 'delimiter') return 'delimiter';
    if (word.value.startsWith('@')) return 'type';
    if (/^-?\d+(?:\.\d+)?$/.test(word.value)) return 'number';
    if (word.value === 'true' || word.value === 'false') return 'literal';
    if (STRUCTURAL_KEYWORDS.has(word.value)) return 'keyword';
    return 'identifier';
}

/**
 * Tokenize one .dlg line without carrying state between lines. The same
 * descriptor match used by completion decides each argument's scope.
 */
export function tokenizeDlgLine(line: string): DlgToken[] {
    const lexed = lexLine(line);
    const match = matchLine(line);
    const scopes = new Map<number, string>();

    if (match) {
        for (let index = 0; index < match.keywordWordCount; index++) {
            scopes.set(
                match.words[index].start,
                match.kind === 'condition' && index === 1
                    ? 'condition'
                    : match.kind === 'effect' && index > 0
                      ? 'effectTarget'
                      : match.kind === 'speaker' &&
                          match.words[index].value !== 'NARRATOR'
                        ? 'reference'
                        : 'keyword'
            );
        }

        const argumentWords = match.words.slice(match.keywordWordCount);
        if (match.kind === 'condition' || match.kind === 'effect') {
            for (let index = 0; index < match.args.length; index++) {
                const arg = match.args[index];
                if (arg.kind === 'text') {
                    for (const word of argumentWords.slice(index)) {
                        scopes.set(
                            word.start,
                            word.value.startsWith('@')
                                ? 'type'
                                : scopeForArgument(arg.kind)
                        );
                    }
                    break;
                }
                if (argumentWords[index]) {
                    scopes.set(
                        argumentWords[index].start,
                        scopeForArgument(arg.kind)
                    );
                }
            }
        } else if (match.kind === 'gotoNode' || match.kind === 'trigger') {
            if (argumentWords[0]) {
                scopes.set(argumentWords[0].start, 'reference');
            }
        } else if (match.kind === 'node') {
            if (argumentWords[0]) {
                scopes.set(argumentWords[0].start, 'reference');
            }
        } else if (
            match.kind === 'choice' ||
            match.kind === 'voice' ||
            match.kind === 'portrait' ||
            match.kind === 'speaker'
        ) {
            for (const word of argumentWords) {
                scopes.set(
                    word.start,
                    word.value.startsWith('@') ? 'type' : 'string'
                );
            }
        }
    }

    const tokens: DlgToken[] = [];
    let previousEnd = 0;
    for (const word of lexed) {
        if (word.start > previousEnd) {
            tokens.push({ startIndex: previousEnd, scopes: 'identifier' });
        }
        tokens.push({
            startIndex: word.start,
            scopes: scopes.get(word.start) ?? defaultScope(word),
        });
        previousEnd = word.end;
    }
    return tokens;
}

/**
 * Return help for the command under the cursor. Longer reference text belongs
 * in an intentional hover, not in Monaco's space-hungry suggestion side panel.
 */
export function dlgHover(line: string, column: number): DlgHover | null {
    const match = matchLine(line);
    if (!match) return null;

    const start = match.words[0]?.start;
    const end = match.words[match.keywordWordCount - 1]?.end;
    const cursorOffset = Math.max(0, column - 1);
    if (start === undefined || end === undefined) return null;
    if (cursorOffset < start || cursorOffset > end) return null;

    let documentation: string | undefined;
    if (match.kind === 'condition') {
        const descriptor = CONDITION_DESCRIPTORS.find(
            (item) => item.keyword === match.keyword
        );
        if (descriptor) {
            documentation = descriptorDocumentation(
                descriptor.label,
                `${match.words[0].value} ${descriptor.keyword}`,
                descriptor.args
            );
        }
    } else if (match.kind === 'effect') {
        const descriptor = EFFECT_DESCRIPTORS.find(
            (item) => item.keyword === match.keyword
        );
        if (descriptor) {
            documentation = descriptorDocumentation(
                descriptor.label,
                descriptor.keyword,
                descriptor.args
            );
        }
    } else {
        const label =
            match.keyword === 'NARRATOR' ? 'NARRATOR:' : match.keyword;
        documentation = STRUCTURAL_COMPLETIONS.find(
            (item) => item.label === label
        )?.documentation;
    }
    if (!documentation) return null;

    return {
        documentation,
        startColumn: start + 1,
        endColumn: end + 1,
    };
}

function currentWordStartColumn(line: string, column: number): number {
    let offset = Math.min(line.length, Math.max(0, column - 1));
    while (offset > 0 && !/\s/.test(line[offset - 1])) offset--;
    return offset + 1;
}

function commandStartColumn(line: string): number {
    const first = line.search(/\S/);
    return first < 0 ? line.length + 1 : first + 1;
}

function keywordCompletion(
    label: string,
    detail: string,
    replaceStartColumn: number,
    documentation: string
): DlgCompletion {
    return {
        label,
        insertText: label,
        detail,
        documentation,
        kind: 'keyword',
        replaceStartColumn,
    };
}

function descriptorSyntax(
    keyword: string,
    args: readonly ArgDescriptor[]
): string {
    return [
        keyword,
        ...args.map((arg) =>
            arg.optional ? `[${arg.name}]` : `<${arg.name}>`
        ),
    ].join(' ');
}

function descriptorDocumentation(
    label: string,
    keyword: string,
    args: readonly ArgDescriptor[]
): string {
    const syntax = descriptorSyntax(keyword, args);
    if (args.length === 0) return `**${label}**\n\n\`${syntax}\``;
    const argumentsList = args
        .map(
            (arg) =>
                `- \`${arg.name}\` — ${arg.label}${arg.optional ? ' (optional)' : ''}`
        )
        .join('\n');
    return `**${label}**\n\n\`${syntax}\`\n\n**Arguments**\n\n${argumentsList}`;
}

function argumentDocumentation(
    label: string,
    kind: DlgArgumentKind,
    argumentValues: string[],
    argumentIndex: number
): string {
    if (kind === 'nodeId') {
        return label === 'location'
            ? '`GOTO location <locationId>` ends the dialogue and moves the player.'
            : `Continue the conversation at the \`${label}\` node.`;
    }
    if (kind === 'stageId') {
        const questId = argumentValues[argumentIndex - 1];
        return questId
            ? `Use stage \`${label}\` from the \`${questId}\` quest.`
            : `Use the \`${label}\` quest stage.`;
    }
    if (kind === 'boolean') return `Use the boolean value \`${label}\`.`;

    const kindLabels: Partial<Record<DlgArgumentKind, string>> = {
        flag: 'flag',
        variable: 'variable',
        stat: 'character stat',
        itemId: 'item',
        characterId: 'character',
        locationId: 'location',
        questId: 'quest',
        journalId: 'journal entry',
        dialogueId: 'dialogue',
        interludeId: 'interlude',
    };
    const kindLabel = kindLabels[kind];
    return kindLabel
        ? `Use the \`${label}\` ${kindLabel} from this project.`
        : `Use \`${label}\`.`;
}

function idsForArgument(
    kind: DlgArgumentKind,
    argumentValues: string[],
    argumentIndex: number,
    context: DlgCompletionContext
): string[] {
    if (kind === 'nodeId') return [...(context.nodeIds ?? [])];
    if (kind === 'flag') {
        return context.nameCatalog?.flags.map((item) => item.id) ?? [];
    }
    if (kind === 'variable') {
        return context.nameCatalog?.variables.map((item) => item.id) ?? [];
    }
    if (kind === 'stat') {
        return context.nameCatalog?.stats.map((item) => item.id) ?? [];
    }
    if (kind === 'boolean') return ['true', 'false'];
    if (kind === 'stageId') {
        const questId = argumentValues[argumentIndex - 1];
        return (
            context.registry?.quests[questId]?.stages.map(
                (stage) => stage.id
            ) ?? []
        );
    }
    const target = REFERENCE_KIND_TARGET[kind];
    if (!target || !context.registry) return [];
    const collection = context.registry[target as keyof ContentRegistry];
    if (!collection || Array.isArray(collection)) return [];
    return Object.keys(collection);
}

/**
 * Return completion choices for a line/cursor pair. Monaco is only the adapter;
 * this function owns the context rules and is directly testable.
 */
export function dlgCompletions(
    line: string,
    column: number,
    context: DlgCompletionContext = {}
): DlgCompletion[] {
    const cursorOffset = Math.max(0, column - 1);
    const comment = lexLine(line).find((word) => word.kind === 'comment');
    if (comment && cursorOffset >= comment.start) return [];

    const cursor = getDlgCursorContext(line, column);
    const trimmedBeforeCursor = line.slice(0, cursorOffset).trimStart();
    const wordStart = currentWordStartColumn(line, column);

    if (cursor.argumentIndex !== null && cursor.argumentKind !== null) {
        const labels = idsForArgument(
            cursor.argumentKind,
            cursor.argumentValues,
            cursor.argumentIndex,
            context
        );
        if (cursor.keyword === 'GOTO') labels.push('location');
        return [...new Set(labels)].sort().map((label) => ({
            label,
            insertText: label,
            detail:
                cursor.argumentKind === 'nodeId'
                    ? label === 'location'
                        ? 'Go to a location'
                        : 'Dialogue node'
                    : 'Project value',
            documentation: argumentDocumentation(
                label,
                cursor.argumentKind!,
                cursor.argumentValues,
                cursor.argumentIndex!
            ),
            kind:
                cursor.argumentKind === 'boolean' ||
                cursor.argumentKind === 'stageId'
                    ? 'value'
                    : 'reference',
            replaceStartColumn: wordStart,
        }));
    }

    const conditionLead = trimmedBeforeCursor.match(
        /^(REQUIRE|IF)(?:\s+\S*)?$/
    );
    if (conditionLead) {
        const lead = conditionLead[1];
        return CONDITION_DESCRIPTORS.map((descriptor) =>
            keywordCompletion(
                descriptor.keyword,
                `${descriptor.label} · ${descriptor.group}`,
                wordStart,
                descriptorDocumentation(
                    descriptor.label,
                    `${lead} ${descriptor.keyword}`,
                    descriptor.args
                )
            )
        );
    }
    if (cursor.keyword !== null) return [];

    const replaceStart = commandStartColumn(line);
    const completions = EFFECT_DESCRIPTORS.map((descriptor) =>
        keywordCompletion(
            descriptor.keyword,
            `${descriptor.label} · ${descriptor.group}`,
            replaceStart,
            descriptorDocumentation(
                descriptor.label,
                descriptor.keyword,
                descriptor.args
            )
        )
    );
    completions.push(
        ...CONDITION_DESCRIPTORS.flatMap((descriptor) => [
            keywordCompletion(
                `REQUIRE ${descriptor.keyword}`,
                `${descriptor.label} · ${descriptor.group}`,
                replaceStart,
                descriptorDocumentation(
                    descriptor.label,
                    `REQUIRE ${descriptor.keyword}`,
                    descriptor.args
                )
            ),
            keywordCompletion(
                `IF ${descriptor.keyword}`,
                `${descriptor.label} · ${descriptor.group}`,
                replaceStart,
                descriptorDocumentation(
                    descriptor.label,
                    `IF ${descriptor.keyword}`,
                    descriptor.args
                )
            ),
        ]),
        ...STRUCTURAL_COMPLETIONS.map((item) =>
            keywordCompletion(
                item.label,
                item.detail,
                replaceStart,
                item.documentation
            )
        )
    );
    return completions;
}
