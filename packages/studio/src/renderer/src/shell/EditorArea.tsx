import type { OpenProject } from '../../../shared/project';
import type { Tab } from '../types';
import { filePathFor } from '../lib/paths';
import { DetailView } from './DetailView';
import { ProjectOverview } from './ProjectOverview';
import { SourceView } from './SourceView';
import { DialogueEditor } from './DialogueEditor';
import { EntityForm } from './EntityForm';
import { GameConfigForm } from './GameConfigForm';
import { ENTITY_FORMS } from '../lib/entity-fields';

export type ViewMode = 'view' | 'source';

export function EditorArea({
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
}: {
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
}) {
    const active = tabs.find((t) => t.key === activeKey) ?? null;
    const activePath = active ? filePathFor(project, active) : null;
    const mode: ViewMode = active ? (viewModes[active.key] ?? 'view') : 'view';

    return (
        <div className="editor">
            <div className="tabs scroll">
                {tabs.map((tab) => (
                    <div
                        key={tab.key}
                        className={`tab ${tab.key === activeKey ? 'tab--active' : ''}`}
                        onClick={() => onSelect(tab.key)}
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
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose(tab.key);
                            }}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            {active && activePath && (
                <div className="editor__toolbar">
                    <div className="seg">
                        <button
                            className={`seg__opt ${mode === 'view' ? 'seg__opt--on' : ''}`}
                            onClick={() => onSetViewMode(active.key, 'view')}
                        >
                            {active.section === 'dialogues' ||
                            active.section === 'config' ||
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
        </div>
    );
}
