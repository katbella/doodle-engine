/**
 * Edit a YAML file in place, changing only the fields a form touched and
 * leaving everything else exactly as written.
 *
 * The visual forms in Doodle Studio need to save a character's `name` or a
 * game's `startLocation` without reflowing the file: comments, key order,
 * blank lines, and any keys the form doesn't know about must survive untouched.
 * Reading the file into a plain object and writing it back would lose all of
 * that, so this edits the YAML document tree (which keeps comments and order)
 * and only replaces the values that actually changed.
 *
 * This lives in the toolkit, not the engine, because it depends on the `yaml`
 * library; the engine core stays dependency-free. A file that is hand-edited
 * and never opened in Studio is unaffected.
 */

import { parseDocument, type Document } from 'yaml';

/** One field change from a form. `path` is the key chain, e.g. ["startTime","hour"]. */
export interface YamlEdit {
    /** Key path from the document root to the value being set. */
    path: (string | number)[];
    /**
     * The new value. Plain JS (string/number/boolean/array/object). When
     * `undefined`, the key is removed. Objects/arrays replace the node whole.
     */
    value: unknown;
}

/**
 * Apply field edits to YAML source, preserving comments, key order, and any
 * keys not mentioned in the edits. Returns the new source text.
 */
export function applyYamlEdits(source: string, edits: YamlEdit[]): string {
    // No edits means no write: return the file untouched rather than round-trip
    // it through the printer (which can renormalize inline-comment spacing).
    if (edits.length === 0) return source;

    const doc = parseDocument(source);

    for (const edit of edits) {
        if (edit.value === undefined) {
            deleteIn(doc, edit.path);
        } else {
            // doc.setIn builds intermediate maps as needed and replaces the
            // leaf, keeping sibling keys and their comments in place.
            doc.setIn(edit.path, edit.value);
        }
    }

    return doc.toString();
}

/**
 * Remove a key path, and clean up an emptied parent map/seq only if that parent
 * itself was one of the edited paths' ancestors we created. We keep it simple:
 * delete the leaf; leave parents alone so we never drop a user's structure.
 */
function deleteIn(doc: Document, path: (string | number)[]): void {
    if (path.length === 0) return;
    // Only delete if the path actually exists, so a missing optional field is a
    // no-op rather than an error.
    if (doc.hasIn(path)) {
        doc.deleteIn(path);
    }
}

