import { useEffect, useRef, useState } from 'react';
import type { OpenProject } from '../../../shared/project';
import { ChevronDown, TriangleAlert, X } from '../lib/icons';
import type { Tab } from '../types';
import { filePathFor } from '../lib/paths';
import { DetailView } from './DetailView';
import { ProjectOverview } from './ProjectOverview';
import { SourceView } from './SourceView';
import { DialogueEditor } from './DialogueEditor';
import { EntityForm } from './EntityForm';
import { GameConfigForm } from './GameConfigForm';
import { LocaleEditor } from './LocaleEditor';
import { ENTITY_FORMS } from '../lib/entity-fields';
import { LocaleWriterBoundary, useLocaleWriter } from '../lib/locale-writer';
import { ConfirmModal } from './ConfirmModal';
import { AnchoredOverlay, PointOverlay } from './OverlayPortal';

export type ViewMode = 'view' | 'source';

interface EditorAreaProps {
    project: OpenProject;
    tabs: Tab[];
    activeKey: string | null;
    viewModes: Record<string, ViewMode>;
    dirtyTabs: Set<string>;
    staleFiles: Set<string>;
    reveal: { key: string; message: string; seq: number } | null;
    onSelect: (key: string) => void;
    onClose: (key: string) => void;
    onSetViewMode: (key: string, mode: ViewMode) => void;
    onDirty: (key: string, dirty: boolean) => void;
    onModified: (filePath: string) => void;
    onOpenLocale?: (locale: string) => void;
    onPlayFromNode: (dialogueId: string, nodeId: string) => void;
}

export function EditorArea(props: EditorAreaProps) {
    return (
        <LocaleWriterBoundary
            project={props.project}
            onModified={props.onModified}
            onOpenLocale={props.onOpenLocale}
        >
            <EditorAreaContent {...props} />
        </LocaleWriterBoundary>
    );
}

function EditorAreaContent({
    project,
    tabs,
    activeKey,
    viewModes,
    dirtyTabs,
    staleFiles,
    reveal,
    onSelect,
    onClose,
    onSetViewMode,
    onDirty,
    onModified,
    onPlayFromNode,
}: EditorAreaProps) {
    const stripRef = useRef<HTMLDivElement>(null);
    const overflowButtonRef = useRef<HTMLButtonElement>(null);
    const tabRefs = useRef(new Map<string, HTMLDivElement>());
    const [overflowing, setOverflowing] = useState(false);
    const [showOverflow, setShowOverflow] = useState(false);
    const [context, setContext] = useState<{
        key: string;
        x: number;
        y: number;
    } | null>(null);
    const [closeRequest, setCloseRequest] = useState<{
        keys: string[];
        keepKey?: string;
    } | null>(null);
    const localeWriter = useLocaleWriter();
    const active = tabs.find((t) => t.key === activeKey) ?? null;
    const activePath = active ? filePathFor(project, active) : null;
    const mode: ViewMode = active ? (viewModes[active.key] ?? 'view') : 'view';

    useEffect(() => {
        const node = tabRefs.current.get(activeKey ?? '');
        if (typeof node?.scrollIntoView === 'function') {
            node.scrollIntoView({ inline: 'nearest', block: 'nearest' });
        }
    }, [activeKey, tabs.length]);

    useEffect(() => {
        const strip = stripRef.current;
        if (!strip) return;
        const measure = () =>
            setOverflowing(strip.scrollWidth > strip.clientWidth + 1);
        measure();
        const observer =
            typeof ResizeObserver === 'undefined'
                ? null
                : new ResizeObserver(measure);
        observer?.observe(strip);
        return () => observer?.disconnect();
    }, [tabs]);

    useEffect(() => {
        if (!showOverflow && !context) return;
        const dismiss = (event: PointerEvent) => {
            const target = event.target as Element | null;
            if (target?.closest('.tabs__menu, .tabs__overflow-button')) return;
            setShowOverflow(false);
            setContext(null);
        };
        window.addEventListener('pointerdown', dismiss);
        return () => window.removeEventListener('pointerdown', dismiss);
    }, [showOverflow, context]);

    const closeKeys = (keys: string[], keepKey?: string) => {
        keys.forEach(onClose);
        if (keepKey) onSelect(keepKey);
        setContext(null);
        setShowOverflow(false);
    };
    const requestClose = (keys: string[], keepKey?: string) => {
        if (keys.some((key) => dirtyTabs.has(key))) {
            setCloseRequest({ keys, keepKey });
            setContext(null);
            setShowOverflow(false);
            return;
        }
        closeKeys(keys, keepKey);
    };
    const closeOthers = (keepKey: string) =>
        requestClose(
            tabs.filter((tab) => tab.key !== keepKey).map((tab) => tab.key),
            keepKey
        );
    const closeAll = () => requestClose(tabs.map((tab) => tab.key));

    const localeConflicts = Object.entries(localeWriter?.files ?? {}).filter(
        ([, file]) => file.conflict || file.missing
    );
    const dirtyCloseCount =
        closeRequest?.keys.filter((key) => dirtyTabs.has(key)).length ?? 0;

    return (
        <div className="editor">
            <div className="tabs__shell">
                <div ref={stripRef} className="tabs">
                    {tabs.map((tab) => (
                        <div
                            ref={(node) => {
                                if (node) tabRefs.current.set(tab.key, node);
                                else tabRefs.current.delete(tab.key);
                            }}
                            key={tab.key}
                            className={`tab ${tab.key === activeKey ? 'tab--active' : ''}`}
                            title={`${tab.label}. Middle-click closes; right-click for tab actions.`}
                            onClick={() => onSelect(tab.key)}
                            onAuxClick={(event) => {
                                if (event.button === 1) onClose(tab.key);
                            }}
                            onContextMenu={(event) => {
                                event.preventDefault();
                                setContext({
                                    key: tab.key,
                                    x: event.clientX,
                                    y: event.clientY,
                                });
                            }}
                        >
                            <span>{tab.label}</span>
                            {dirtyTabs.has(tab.key) && (
                                <span
                                    className="tab__dirty"
                                    title="Unsaved changes"
                                />
                            )}
                            <button
                                className="tab__close"
                                aria-label={`Close ${tab.label}`}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onClose(tab.key);
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
                {overflowing && (
                    <button
                        ref={overflowButtonRef}
                        className="tabs__overflow-button"
                        aria-label="Show all open tabs"
                        aria-expanded={showOverflow}
                        onClick={() => setShowOverflow((open) => !open)}
                    >
                        <ChevronDown size={15} />
                    </button>
                )}
                {showOverflow && (
                    <AnchoredOverlay
                        anchorRef={overflowButtonRef}
                        align="end"
                        className="tabs__menu tabs__menu--overflow"
                    >
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                className={
                                    tab.key === activeKey
                                        ? 'tabs__menu-item tabs__menu-item--active'
                                        : 'tabs__menu-item'
                                }
                                onClick={() => {
                                    onSelect(tab.key);
                                    setShowOverflow(false);
                                }}
                            >
                                <span>{tab.label}</span>
                                {dirtyTabs.has(tab.key) && (
                                    <span className="tab__dirty" />
                                )}
                            </button>
                        ))}
                        <div className="tabs__menu-separator" />
                        <button className="tabs__menu-item" onClick={closeAll}>
                            Close all
                        </button>
                    </AnchoredOverlay>
                )}
            </div>

            {context && (
                <PointOverlay
                    x={context.x}
                    y={context.y}
                    className="tabs__menu tabs__menu--context"
                >
                    <button
                        className="tabs__menu-item"
                        onClick={() => closeOthers(context.key)}
                        disabled={tabs.length < 2}
                    >
                        Close others
                    </button>
                    <button className="tabs__menu-item" onClick={closeAll}>
                        Close all
                    </button>
                </PointOverlay>
            )}

            {active && activePath && (
                <div className="editor__toolbar">
                    <div className="seg">
                        <button
                            className={`seg__opt ${mode === 'view' ? 'seg__opt--on' : ''}`}
                            onClick={() => onSetViewMode(active.key, 'view')}
                        >
                            {active.section === 'dialogues' ||
                            active.section === 'config' ||
                            active.section === 'locales' ||
                            ENTITY_FORMS[active.section]
                                ? 'Visual'
                                : 'View'}
                        </button>
                        <button
                            className={`seg__opt ${mode === 'source' ? 'seg__opt--on' : ''}`}
                            onClick={() => onSetViewMode(active.key, 'source')}
                        >
                            Source
                        </button>
                    </div>
                </div>
            )}

            {localeConflicts.map(([locale, file]) => (
                <div className="banner" key={locale}>
                    <TriangleAlert
                        className="banner__icon"
                        size={15}
                        aria-hidden
                    />
                    <span>
                        {file.missing
                            ? 'The ' +
                              locale +
                              ' locale file was deleted outside Studio.'
                            : 'The ' +
                              locale +
                              ' locale changed outside Studio while localized text had unsaved edits.'}
                    </span>
                    {!file.missing && (
                        <button
                            className="btn"
                            onClick={() => void localeWriter?.reload(locale)}
                        >
                            Reload
                        </button>
                    )}
                    <button
                        className="btn"
                        onClick={() => void localeWriter?.flush(locale, true)}
                    >
                        {file.missing ? 'Recreate it' : 'Overwrite'}
                    </button>
                </div>
            ))}

            {/* Source editors stay mounted so each file keeps its own undo
                history and doesn't reload when you switch tabs. */}
            {tabs.map((tab) => {
                const path = filePathFor(project, tab);
                if (!path || (viewModes[tab.key] ?? 'view') !== 'source') {
                    return null;
                }
                return (
                    <div
                        key={tab.key}
                        className="editor__source-body"
                        style={{
                            display: tab.key === activeKey ? 'flex' : 'none',
                        }}
                    >
                        <SourceView
                            project={project}
                            tabKey={tab.key}
                            path={path}
                            stale={staleFiles.has(path)}
                            revealMessage={
                                reveal?.key === tab.key
                                    ? reveal.message
                                    : undefined
                            }
                            revealSeq={
                                reveal?.key === tab.key ? reveal.seq : undefined
                            }
                            onDirty={onDirty}
                            onModified={onModified}
                        />
                    </div>
                );
            })}

            {(!active || mode !== 'source' || !activePath) &&
                (!active ? (
                    <div className="editor__body scroll">
                        <ProjectOverview project={project} />
                    </div>
                ) : active.section === 'dialogues' && activePath ? (
                    <div className="editor__source-body">
                        <DialogueEditor
                            key={active.key}
                            project={project}
                            tabKey={active.key}
                            path={activePath}
                            dialogueId={active.itemId}
                            onDirty={onDirty}
                            onModified={onModified}
                            onPlayFromNode={onPlayFromNode}
                        />
                    </div>
                ) : active.section === 'config' && activePath ? (
                    <div className="editor__source-body">
                        <GameConfigForm
                            key={active.key}
                            project={project}
                            tabKey={active.key}
                            path={activePath}
                            onDirty={onDirty}
                            onModified={onModified}
                        />
                    </div>
                ) : active.section === 'locales' && activePath ? (
                    <div className="editor__source-body">
                        <LocaleEditor
                            key={active.key}
                            project={project}
                            tabKey={active.key}
                            path={activePath}
                            localeId={active.itemId}
                            onDirty={onDirty}
                            onModified={onModified}
                        />
                    </div>
                ) : ENTITY_FORMS[active.section] && activePath ? (
                    <div className="editor__source-body">
                        <EntityForm
                            key={active.key}
                            project={project}
                            tabKey={active.key}
                            section={active.section}
                            path={activePath}
                            onDirty={onDirty}
                            onModified={onModified}
                        />
                    </div>
                ) : (
                    <div className="editor__body scroll">
                        <DetailView project={project} tab={active} />
                    </div>
                ))}
            {closeRequest && (
                <ConfirmModal
                    title="Close tabs with unsaved edits?"
                    message={
                        dirtyCloseCount +
                        ' affected tab' +
                        (dirtyCloseCount === 1 ? ' has' : 's have') +
                        ' unsaved edits. Closing now may discard them.'
                    }
                    confirmLabel="Close tabs"
                    danger
                    onConfirm={() => {
                        closeKeys(closeRequest.keys, closeRequest.keepKey);
                        setCloseRequest(null);
                    }}
                    onCancel={() => setCloseRequest(null)}
                />
            )}
        </div>
    );
}
