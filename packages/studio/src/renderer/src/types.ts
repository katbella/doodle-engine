export type SectionKey =
    | 'dialogues'
    | 'characters'
    | 'locations'
    | 'items'
    | 'quests'
    | 'maps'
    | 'interludes'
    | 'journal'
    | 'locales'
    | 'config';

export type ItemStatus = 'valid' | 'warn' | 'error' | 'none';

export interface RailItem {
    id: string;
    label: string;
    status: ItemStatus;
}

export interface RailSection {
    key: SectionKey;
    label: string;
    items: RailItem[];
}

export interface Tab {
    /** Unique key, `${section}:${itemId}`. */
    key: string;
    section: SectionKey;
    itemId: string;
    label: string;
}
