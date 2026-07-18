import type { OpenProject } from '../../../shared/project';

export function ProjectOverview({ project }: { project: OpenProject }) {
    const r = project.registry;
    const counts: [string, number][] = [
        ['Dialogues', Object.keys(r.dialogues).length],
        ['Characters', Object.keys(r.characters).length],
        ['Locations', Object.keys(r.locations).length],
        ['Items', Object.keys(r.items).length],
        ['Quests', Object.keys(r.quests).length],
        ['Maps', Object.keys(r.maps).length],
        ['Interludes', Object.keys(r.interludes).length],
        ['Journal', Object.keys(r.journalEntries).length],
        ['Locales', Object.keys(r.locales).length],
    ];

    const engineStatus = project.engine.depsInstalled
        ? (project.engine.installed ?? project.engine.declared ?? 'installed')
        : 'not installed yet — select Install dependencies';

    return (
        <div className="overview">
            <div className="detail__head">
                <span className="detail__title">{project.name}</span>
                <span className="detail__kind">project overview</span>
            </div>
            <div className="detail__row">
                <span className="detail__key">version</span>
                <span className="detail__value">{project.version ?? '—'}</span>
            </div>
            <div className="detail__row">
                <span className="detail__key">Doodle Engine</span>
                <span className="detail__value">{engineStatus}</span>
            </div>
            <div className="detail__row">
                <span className="detail__key">Declared version</span>
                <span className="detail__value">
                    {project.engine.declared ?? '—'}
                </span>
            </div>
            <div className="detail__row">
                <span className="detail__key">location</span>
                <span className="detail__value">{project.projectDir}</span>
            </div>

            <div className="overview__counts">
                {counts.map(([label, n]) => (
                    <div key={label} className="overview__count">
                        <span className="overview__count-n">{n}</span>
                        <span className="overview__count-l">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
