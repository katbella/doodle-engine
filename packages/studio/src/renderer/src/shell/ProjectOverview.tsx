import type { OpenProject } from '../../../shared/project';
import { ExternalLink } from '../lib/icons';

export function ProjectOverview({ project }: { project: OpenProject }) {
    const r = project.registry;
    const contentGroups: Array<{
        label: string;
        items: Array<[string, number]>;
    }> = [
        {
            label: 'Narrative',
            items: [
                ['Dialogues', Object.keys(r.dialogues).length],
                ['Characters', Object.keys(r.characters).length],
                ['Quests', Object.keys(r.quests).length],
                ['Journal entries', Object.keys(r.journalEntries).length],
            ],
        },
        {
            label: 'World',
            items: [
                ['Locations', Object.keys(r.locations).length],
                ['Maps', Object.keys(r.maps).length],
                ['Items', Object.keys(r.items).length],
            ],
        },
        {
            label: 'Presentation',
            items: [
                ['Interludes', Object.keys(r.interludes).length],
                ['Locales', Object.keys(r.locales).length],
            ],
        },
    ];
    const contentTotal = contentGroups.reduce(
        (total, group) =>
            total + group.items.reduce((sum, [, count]) => sum + count, 0),
        0
    );
    const contentTotalLabel =
        contentTotal === 0
            ? 'No files'
            : `${contentTotal} ${contentTotal === 1 ? 'file' : 'files'}`;
    const problemCount = project.problems.length;
    const engineVersion =
        project.engine.installed ?? project.engine.declared ?? 'Not declared';
    const engineState = project.engine.depsInstalled
        ? `${engineVersion} · Dependencies installed`
        : `${engineVersion} · Install required`;
    const startTime = `Day ${project.config.startTime.day} · ${String(
        project.config.startTime.hour
    ).padStart(2, '0')}:00`;

    const startingState = [
        ['Location', project.config.startLocation || 'Not set'],
        ['Time', startTime],
        ['Inventory', `${project.config.startInventory.length} items`],
        [
            'Story state',
            `${Object.keys(project.config.startFlags).length} flags · ${
                Object.keys(project.config.startVariables).length
            } variables`,
        ],
    ];

    return (
        <div className="overview">
            <header className="overview__hero">
                <div className="overview__identity">
                    <span className="overview__kicker">Project overview</span>
                    <h1 className="overview__title">{project.name}</h1>
                    <p className="overview__path" title={project.projectDir}>
                        {project.projectDir}
                    </p>
                </div>
                <button
                    className="btn overview__docs"
                    onClick={() => void window.studio.openDocumentation()}
                    aria-label="Open Doodle Studio documentation"
                >
                    Documentation
                    <ExternalLink size={14} aria-hidden />
                </button>
            </header>

            <dl className="overview__rows" aria-label="Project status">
                <div className="overview__row">
                    <dt>Project version</dt>
                    <dd>{project.version ?? 'Unversioned'}</dd>
                </div>
                <div className="overview__row">
                    <dt>Doodle Engine</dt>
                    <dd>{engineState}</dd>
                </div>
                <div className="overview__row">
                    <dt>Validation</dt>
                    <dd>
                        {problemCount === 0
                            ? 'No known problems'
                            : `${problemCount} ${
                                  problemCount === 1 ? 'problem' : 'problems'
                              }`}
                    </dd>
                </div>
            </dl>

            <section
                className="overview__section"
                aria-labelledby="overview-content-title"
            >
                <div className="overview__section-head">
                    <div>
                        <h2
                            className="overview__section-title"
                            id="overview-content-title"
                        >
                            Project content
                        </h2>
                        <p className="overview__section-copy">
                            Project files grouped by content type.
                        </p>
                    </div>
                    <span className="overview__content-total">
                        {contentTotalLabel}
                    </span>
                </div>

                {contentGroups.map((group) => (
                    <div key={group.label} className="overview__group">
                        <h3 className="overview__group-title">{group.label}</h3>
                        <dl className="overview__rows overview__rows--compact">
                            {group.items.map(([label, count]) => (
                                <div key={label} className="overview__row">
                                    <dt>{label}</dt>
                                    <dd>{count}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                ))}
            </section>

            <section
                className="overview__section"
                aria-labelledby="overview-start-title"
            >
                <div className="overview__section-head">
                    <div>
                        <h2
                            className="overview__section-title"
                            id="overview-start-title"
                        >
                            Starting state
                        </h2>
                        <p className="overview__section-copy">
                            Where a new game begins.
                        </p>
                    </div>
                </div>
                <dl className="overview__rows overview__rows--compact">
                    {startingState.map(([label, value]) => (
                        <div key={label} className="overview__row">
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section
                className="overview__section"
                aria-labelledby="overview-setup-title"
            >
                <div className="overview__section-head">
                    <div>
                        <h2
                            className="overview__section-title"
                            id="overview-setup-title"
                        >
                            Project setup
                        </h2>
                        <p className="overview__section-copy">
                            Runtime and dependency details.
                        </p>
                    </div>
                </div>
                <dl className="overview__rows overview__rows--compact">
                    <div className="overview__row">
                        <dt>Package manager</dt>
                        <dd>{project.engine.packageManager}</dd>
                    </div>
                    <div className="overview__row">
                        <dt>Dependencies</dt>
                        <dd>
                            {project.engine.depsInstalled
                                ? 'Installed'
                                : 'Install required'}
                        </dd>
                    </div>
                    <div className="overview__row">
                        <dt>Declared engine</dt>
                        <dd>{project.engine.declared ?? 'Not set'}</dd>
                    </div>
                </dl>
            </section>
        </div>
    );
}
