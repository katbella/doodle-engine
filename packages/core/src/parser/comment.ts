/**
 * Shared, quote-aware comment splitting for the dialogue DSL.
 *
 * One shared function used by both the runtime tokenizer (./index.ts) and the
 * editing parser (./cst.ts), so the two can never disagree about where a
 * comment begins. Kept separate precisely so this rule lives in one place.
 *
 * The rule: a '#' before a quoted span starts a comment; a '#' inside quotes is
 * preserved as text, and any '#' after the closing quote begins the comment.
 * (Only the first quoted span on the line participates in this decision, which
 * matches the DSL's use of quotes for a single display-text value per line.)
 *
 * Inside a quoted span, \" is a double quote and \\ is a backslash, so quoted
 * text can itself contain quotes. The parser and serializer follow the same
 * rule.
 */

/**
 * Split a raw line into its code and its trailing/standalone comment.
 *
 * @param raw - One line of source, without its newline.
 * @returns `code` (the line with any comment removed) and `comment` (the
 * comment text including its leading '#', or null when there is none).
 */
export function splitComment(raw: string): {
    code: string;
    comment: string | null;
} {
    const hashIndex = raw.indexOf('#');
    if (hashIndex === -1) {
        return { code: raw, comment: null };
    }

    const quoteStart = findUnescapedQuote(raw);
    if (quoteStart === -1 || hashIndex < quoteStart) {
        return {
            code: raw.substring(0, hashIndex),
            comment: raw.substring(hashIndex),
        };
    }

    const quoteEnd = findUnescapedQuote(raw, quoteStart + 1);
    if (quoteEnd === -1) {
        return { code: raw, comment: null };
    }
    if (hashIndex < quoteEnd + 1) {
        // '#' inside the quotes: preserve it; strip any '#' after the quote.
        const after = raw.substring(quoteEnd + 1);
        const afterHash = after.indexOf('#');
        if (afterHash === -1) {
            return { code: raw, comment: null };
        }
        return {
            code:
                raw.substring(0, quoteEnd + 1) + after.substring(0, afterHash),
            comment: after.substring(afterHash),
        };
    }
    // '#' after the closing quote: comment from there.
    return {
        code: raw.substring(0, hashIndex),
        comment: raw.substring(hashIndex),
    };
}

export function findUnescapedQuote(text: string, from = 0): number {
    for (let i = from; i < text.length; i++) {
        if (text[i] !== '"') continue;
        let backslashes = 0;
        for (let j = i - 1; j >= 0 && text[j] === '\\'; j--) backslashes++;
        if (backslashes % 2 === 0) return i;
    }
    return -1;
}
