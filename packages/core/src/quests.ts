import type { ContentRegistry } from './types/registry';
import type { GameState } from './types/state';
import type { QuestStatus } from './types/conditions';

/** Derive quest status from progress and authored quest stages. */
export function getQuestStatus(
    questId: string,
    state: GameState,
    registry: ContentRegistry
): QuestStatus {
    const stageId = state.questProgress[questId];
    if (stageId === undefined) return 'not_started';

    const stage = registry.quests[questId]?.stages.find(
        (candidate) => candidate.id === stageId
    );
    return stage?.completesQuest === true ? 'complete' : 'active';
}
