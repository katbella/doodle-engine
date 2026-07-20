import { useEffect, useMemo, useRef, useState } from 'react';
import { TriangleAlert } from '../lib/icons';
import { parseDialogueCst } from '@doodle-engine/core';
import type { OpenProject } from '../../../shared/project';
import { MonacoEditor, type EditorMarker } from './MonacoEditor';
import { languageForPath } from '../lib/monaco-setup';
import { lineInMessage, quotedTokenInMessage } from '../lib/paths';

const norm = (s: string) => s.replace(/\\/g, '/');

/** First non-comment line that contains a token (1-based), or 0. */
function findCodeLine(content: string, token: string): number {
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trimStart().startsWith('#')) continue;
        if (lines[i].includes(token)) return i + 1;
    }
    return 0;
}

/** Best-effort line number for a problem message in the given file, or 0 when
 * the message gives nothing to locate (no marker is better than a wrong one). */
function lineForMessage(
    path: string,
    content: string,
    message: string
): number {
    const embedded = lineInMessage(message);
    if (embedded) return embedded;
    if (path.endsWith('.dlg')) {
        const nodeMatch = message.match(/Node "([^"]+)"/);
        if (nodeMatch) {
            try {
                const cst = parseDialogueCst(content, 'doc');
                const node = cst.nodes.find((n) => n.id === nodeMatch[1]);
                if (node) return node.headerLine + 1;
            } catch {
                // fall through to the token searches
            }
        }
    }
    const quoted = quotedTokenInMessage(message);
    if (quoted) {
        const line = findCodeLine(content, quoted);
        if (line) return line;
    }
    if (path.endsWith('.dlg')) {
        // Messages like "Unknown effect keyword: hurrdurr" end with the
        // offending token; find the line it appears on.
        const token = message.split(':').pop()?.trim().split(/\s+/)[0];
        if (token) {
            const line = findCodeLine(content, token);
            if (line) return line;
        }
    }
    return 0;
}

export function SourceView({
    project,
    tabKey,
    path,
    stale,
    revealMessage,
    revealSeq,
    onDirty,
    onModified,
}: {
    project: OpenProject;
    tabKey: string;
    path: string;
    stale: boolean;
    revealMessage?: string;
    revealSeq?: number;
    onDirty: (tabKey: string, dirty: boolean) => void;
    onModified: (filePath: string) => void;
}) {
    const [content, setContent] = useState('');
    const [saved, setSaved] = useState('');
    const [mtimeMs, setMtimeMs] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [conflict, setConflict] = useState<string | null>(null);
    const [missing, setMissing] = useState(false);
    const [recovered, setRecovered] = useState<string | null>(null);

    const dir = project.projectDir;

    useEffect(() => {
        let alive = true;
        setLoading(true);
        setError(null);
        setConflict(null);
        (async () => {
            try {
                const doc = await window.studio.readDocument(dir, path);
                if (!alive) return;
                setContent(doc.content);
                setSaved(doc.content);
                setMtimeMs(doc.mtimeMs);
                const buffer = await window.studio.readRecovery(dir, path);
                if (alive && buffer !== null && buffer !== doc.content) {
                    setRecovered(buffer);
                }
            } catch (e) {
                if (alive) setError(e instanceof Error ? e.message : String(e));
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [dir, path]);

    const dirty = content !== saved;
    useEffect(() => onDirty(tabKey, dirty), [dirty, tabKey, onDirty]);

    // Read the latest content/saved from a stable subscription callback.
    const contentRef = useRef(content);
    contentRef.current = content;
    const savedRef = useRef(saved);
    savedRef.current = saved;

    // Reflect changes made to this file outside Studio. With no unsaved edits,
    // reload it silently; with unsaved edits, offer a conflict rather than
    // clobbering the user's work. A file that can no longer be read was
    // deleted outside Studio; the banner offers to recreate it.
    useEffect(() => {
        return window.studio.onFileChanged(async (changedRel) => {
            if (norm(changedRel) !== norm(path)) return;
            let doc;
            try {
                doc = await window.studio.readDocument(dir, path);
            } catch {
                setMissing(true);
                return;
            }
            setMissing(false);
            if (doc.content === contentRef.current) return;
            if (contentRef.current !== savedRef.current) {
                setConflict(doc.content);
                setMtimeMs(doc.mtimeMs);
            } else {
                setContent(doc.content);
                setSaved(doc.content);
                setMtimeMs(doc.mtimeMs);
                onModified(path);
            }
        });
    }, [dir, path, onModified]);

    // Keep a recovery buffer while there are unsaved changes.
    useEffect(() => {
        if (!dirty) return;
        const t = setTimeout(
            () => void window.studio.saveRecovery(dir, path, content),
            600
        );
        return () => clearTimeout(t);
    }, [content, dirty, dir, path]);

    const save = async (force = false) => {
        const result = await window.studio.writeDocument(
            dir,
            path,
            content,
            force ? undefined : mtimeMs
        );
        if (result.conflict) {
            if (result.missing) {
                setMissing(true);
            } else {
                setConflict(result.content ?? '');
            }
            setMtimeMs(result.mtimeMs);
        } else if (result.ok) {
            setSaved(content);
            setMtimeMs(result.mtimeMs);
            setConflict(null);
            setMissing(false);
            void window.studio.clearRecovery(dir, path);
            onModified(path);
        }
    };

    // Autosave a short while after the last edit, so work isn't lost. Skipped
    // while a conflict is unresolved (the user must choose reload or overwrite).
    useEffect(() => {
        if (!dirty || conflict !== null || missing) return;
        const t = setTimeout(() => void save(), 1000);
        return () => clearTimeout(t);
    }, [content, dirty, conflict, missing]);

    // Save any pending edit when this editor goes away (closing the tab,
    // switching views, or opening another project), so a quick edit followed
    // by navigation still lands on disk.
    const flushRef = useRef(() => {});
    flushRef.current = () => {
        if (dirty && conflict === null && !missing) void save();
    };
    useEffect(() => () => flushRef.current(), []);

    // Validation markers refer to saved text and stay hidden after an edit
    // until validation runs again.
    const markers = useMemo<EditorMarker[]>(
        () =>
            stale
                ? []
                : project.problems
                      .filter((p) => norm(p.file) === norm(path))
                      .map((p) => ({
                          line: lineForMessage(path, saved, p.message),
                          message: p.message,
                      }))
                      .filter((marker) => marker.line > 0),
        [stale, project.problems, path, saved]
    );

    const revealLine = revealMessage
        ? lineForMessage(path, saved, revealMessage)
        : undefined;

    if (loading) {
        return (
            <div className="editor__empty">
                <span className="spinner" />
                Loading…
            </div>
        );
    }
    if (error) {
        return <div className="editor__empty">{error}</div>;
    }

    return (
        <div className="source">
            {recovered !== null && (
                <div className="banner">
                    <TriangleAlert
                        className="banner__icon"
                        size={15}
                        aria-hidden
                    />
                    <span>
                        Unsaved changes were recovered from a previous session.
                    </span>
                    <button
                        className="btn"
                        onClick={() => {
                            setContent(recovered);
                            setRecovered(null);
                        }}
                    >
                        Restore
                    </button>
                    <button
                        className="btn"
                        onClick={() => {
                            void window.studio.clearRecovery(dir, path);
                            setRecovered(null);
                        }}
                    >
                        Discard
                    </button>
                </div>
            )}
            {missing && (
                <div className="banner">
                    <TriangleAlert
                        className="banner__icon"
                        size={15}
                        aria-hidden
                    />
                    <span>This file was deleted outside Studio.</span>
                    <button className="btn" onClick={() => save(true)}>
                        Recreate it
                    </button>
                </div>
            )}
            {conflict !== null && (
                <div className="banner">
                    <TriangleAlert
                        className="banner__icon"
                        size={15}
                        aria-hidden
                    />
                    <span>This file changed on disk since you opened it.</span>
                    <button
                        className="btn"
                        onClick={() => {
                            setContent(conflict);
                            setSaved(conflict);
                            setConflict(null);
                            void window.studio.clearRecovery(dir, path);
                        }}
                    >
                        Reload
                    </button>
                    <button className="btn" onClick={() => save(true)}>
                        Overwrite
                    </button>
                </div>
            )}
            <div className="source__bar">
                <span className="source__path mono">
                    <span className="source__path-text">{path}</span>
                    {dirty && <span className="tab__dirty" />}
                </span>
                <button
                    className="btn"
                    onClick={() => save()}
                    disabled={!dirty}
                >
                    Save
                </button>
            </div>
            <div className="source__monaco">
                <MonacoEditor
                    value={content}
                    language={languageForPath(path)}
                    markers={markers}
                    revealLine={revealLine}
                    revealSeq={revealSeq}
                    onChange={setContent}
                    onSave={() => {
                        if (content !== saved) void save();
                    }}
                />
            </div>
        </div>
    );
}
