/**
 * Journal - Displays unlocked journal entries and quests
 */

import type { SnapshotQuest, SnapshotJournalEntry } from '@doodle-engine/core';
import { uiText } from '../uiText';

export interface JournalProps {
    quests: SnapshotQuest[];
    entries: SnapshotJournalEntry[];
    /** Resolved UI strings from snapshot.ui; English defaults when absent. */
    ui?: Record<string, string>;
    className?: string;
    onTrackQuest?: (questId: string) => void;
}

export function Journal({
    quests,
    entries,
    ui,
    className = '',
    onTrackQuest,
}: JournalProps) {
    const activeQuests = quests.filter((quest) => quest.status === 'active');
    const completedQuests = quests.filter(
        (quest) => quest.status === 'complete'
    );

    const renderQuest = (quest: SnapshotQuest) => (
        <article
            key={quest.id}
            className={`quest-entry${quest.status === 'complete' ? ' quest-entry-complete' : ''}${quest.tracked ? ' quest-entry-tracked' : ''}`}
        >
            <h4 className="quest-name">{quest.name}</h4>
            <p className="quest-description">{quest.description}</p>
            <p className="quest-stage">{quest.currentStageDescription}</p>
            {onTrackQuest && quest.status === 'active' && (
                <button
                    type="button"
                    className="quest-track-button"
                    aria-pressed={quest.tracked}
                    onClick={() => onTrackQuest(quest.id)}
                >
                    {uiText(
                        ui,
                        quest.tracked
                            ? 'ui.stop_tracking_quest'
                            : 'ui.track_quest'
                    )}
                </button>
            )}
        </article>
    );

    return (
        <div className={`journal ${className}`}>
            <h2 className="journal-title">{uiText(ui, 'ui.journal')}</h2>

            {quests.length > 0 && (
                <div className="journal-quests doodle-scroll doodle-scroll-parchment">
                    <h3 className="doodle-section-label">
                        {uiText(ui, 'ui.active_quests')}
                    </h3>
                    {activeQuests.length > 0 ? (
                        activeQuests.map(renderQuest)
                    ) : (
                        <p className="journal-quests-empty">
                            {uiText(ui, 'ui.no_active_quests')}
                        </p>
                    )}
                    {completedQuests.length > 0 && (
                        <section className="journal-quests-completed">
                            <h3 className="doodle-section-label">
                                {uiText(ui, 'ui.completed_quests')}
                            </h3>
                            {completedQuests.map(renderQuest)}
                        </section>
                    )}
                </div>
            )}

            {entries.length > 0 && (
                <div className="journal-entries doodle-scroll doodle-scroll-parchment">
                    <h3 className="doodle-section-label">
                        {uiText(ui, 'ui.entries')}
                    </h3>
                    <div className="journal-entry-list">
                        {entries.map((entry) => (
                            <article
                                key={entry.id}
                                className={`journal-entry journal-category-${entry.category}`}
                            >
                                <h4 className="entry-title">{entry.title}</h4>
                                <p className="entry-text">{entry.text}</p>
                            </article>
                        ))}
                    </div>
                </div>
            )}

            {quests.length === 0 && entries.length === 0 && (
                <p className="journal-empty">{uiText(ui, 'ui.no_entries')}</p>
            )}
        </div>
    );
}
