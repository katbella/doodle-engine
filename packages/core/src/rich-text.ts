export interface RichTextSegment {
    text: string;
    bold?: boolean;
    italic?: boolean;
    color?: string;
}

interface TextStyle {
    bold: boolean;
    italic: boolean;
    color?: string;
}

interface ParseResult {
    segments: RichTextSegment[];
    index: number;
    closed: boolean;
}

const COLOR_OPEN = /^c([0-9a-fA-F]{6})\[/;

function sameStyle(segment: RichTextSegment, style: TextStyle): boolean {
    return (
        Boolean(segment.bold) === style.bold &&
        Boolean(segment.italic) === style.italic &&
        segment.color === style.color
    );
}

function append(
    segments: RichTextSegment[],
    text: string,
    style: TextStyle
): void {
    if (text === '') return;

    const previous = segments.at(-1);
    if (previous && sameStyle(previous, style)) {
        previous.text += text;
        return;
    }

    segments.push({
        text,
        ...(style.bold ? { bold: true } : {}),
        ...(style.italic ? { italic: true } : {}),
        ...(style.color ? { color: style.color } : {}),
    });
}

function escapedCharacter(text: string, index: number): string | null {
    const next = text[index + 1];
    if (next === '*' || next === '_' || next === '[' || next === ']') {
        return next;
    }
    if (next === '\\') return '\\';
    if (next === 'c' && COLOR_OPEN.test(text.slice(index + 1))) return 'c';
    return null;
}

function parseSequence(
    text: string,
    start: number,
    closing: '*' | '_' | ']' | null,
    style: TextStyle
): ParseResult {
    const segments: RichTextSegment[] = [];
    let plain = '';
    let index = start;

    const flush = () => {
        append(segments, plain, style);
        plain = '';
    };

    while (index < text.length) {
        const character = text[index];

        if (closing !== null && character === closing) {
            flush();
            return { segments, index: index + 1, closed: true };
        }

        if (character === '\\') {
            const escaped = escapedCharacter(text, index);
            if (escaped !== null) {
                plain += escaped;
                index += 2;
                continue;
            }
            plain += character;
            index++;
            continue;
        }

        if (character === '*' || character === '_') {
            const nested = parseSequence(text, index + 1, character, {
                ...style,
                ...(character === '*' ? { bold: true } : { italic: true }),
            });
            if (nested.closed && nested.segments.length > 0) {
                flush();
                segments.push(...nested.segments);
                index = nested.index;
                continue;
            }
            plain += character;
            index++;
            continue;
        }

        const color = text.slice(index).match(COLOR_OPEN);
        if (color) {
            const nested = parseSequence(text, index + color[0].length, ']', {
                ...style,
                color: `#${color[1].toUpperCase()}`,
            });
            if (nested.closed && nested.segments.length > 0) {
                flush();
                segments.push(...nested.segments);
                index = nested.index;
                continue;
            }
        }

        plain += character;
        index++;
    }

    flush();
    return { segments, index, closed: closing === null };
}

/**
 * Parse Doodle dialogue formatting into renderer-neutral text segments.
 *
 * Supported forms:
 * - `*text*` for bold
 * - `_text_` for italics
 * - `cRRGGBB[text]` for color
 *
 * Formatting may be nested. A backslash escapes formatting punctuation.
 * Unclosed or otherwise incomplete formatting remains literal text.
 */
export function parseRichText(text: string): RichTextSegment[] {
    return parseSequence(text, 0, null, {
        bold: false,
        italic: false,
    }).segments;
}
