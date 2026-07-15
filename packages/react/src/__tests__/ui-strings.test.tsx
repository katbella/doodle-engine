/**
 * Server-rendered checks that the built-in components read their labels from
 * the ui strings instead of hard-coded English. Every component is rendered
 * with a sentinel translation for every key; if a default English label shows
 * up anyway, that label is not localizable.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildUIStrings } from '@doodle-engine/core';
import { CharacterList } from '../components/CharacterList';
import { Inventory } from '../components/Inventory';
import { Journal } from '../components/Journal';
import { PlayerNotes } from '../components/PlayerNotes';
import { PauseMenu } from '../components/PauseMenu';
import { SettingsPanel } from '../components/SettingsPanel';
import { GameTime } from '../components/GameTime';
import { SplashScreen } from '../components/SplashScreen';
import { LoadingScreen } from '../components/LoadingScreen';
import { LocationView } from '../components/LocationView';

// A locale where every ui key translates to XX<key>XX, so untranslated
// English is easy to spot.
function sentinelUi(): Record<string, string> {
    const english = buildUIStrings({});
    const sentinel: Record<string, string> = {};
    for (const key of Object.keys(english)) {
        // Keep any {placeholder} from the default so values still fill in.
        const placeholders = english[key].match(/\{\w+\}/g) ?? [];
        sentinel[key] = [`XX${key}XX`, ...placeholders].join(' ');
    }
    return buildUIStrings(sentinel);
}

const ui = sentinelUi();

const audio = {
    masterVolume: 1,
    musicVolume: 1,
    soundVolume: 1,
    voiceVolume: 1,
    setMasterVolume: () => {},
    setMusicVolume: () => {},
    setSoundVolume: () => {},
    setVoiceVolume: () => {},
};

describe('built-in labels come from ui strings', () => {
    it('CharacterList heading', () => {
        const html = renderToStaticMarkup(
            <CharacterList
                ui={ui}
                characters={[
                    {
                        id: 'a',
                        name: 'Anna',
                        portrait: '',
                        biography: '',
                        location: 'town',
                        inParty: false,
                        relationship: 0,
                        stats: {},
                    },
                ]}
                onTalkTo={() => {}}
            />
        );
        expect(html).toContain('XXui.charactersXX');
        expect(html).not.toContain('>Characters<');
    });

    it('Inventory heading, empty state, and close button', () => {
        const html = renderToStaticMarkup(<Inventory ui={ui} items={[]} />);
        expect(html).toContain('XXui.inventoryXX');
        expect(html).toContain('XXui.no_itemsXX');
        expect(html).not.toContain('>No items<');
    });

    it('Journal headings', () => {
        const html = renderToStaticMarkup(
            <Journal
                ui={ui}
                quests={[
                    {
                        id: 'q',
                        name: 'Q',
                        description: 'd',
                        currentStage: 's',
                        currentStageDescription: 'sd',
                    },
                ]}
                entries={[{ id: 'e', title: 't', text: 'x', category: 'lore' }]}
            />
        );
        expect(html).toContain('XXui.journalXX');
        expect(html).toContain('XXui.active_questsXX');
        expect(html).toContain('XXui.entriesXX');

        const empty = renderToStaticMarkup(
            <Journal ui={ui} quests={[]} entries={[]} />
        );
        expect(empty).toContain('XXui.no_entriesXX');
        expect(empty).not.toContain('No entries yet');
    });

    it('PlayerNotes labels and placeholders', () => {
        const html = renderToStaticMarkup(
            <PlayerNotes
                ui={ui}
                notes={[{ id: 'n', title: 'a', text: 'b' }]}
                onWrite={() => {}}
                onDelete={() => {}}
            />
        );
        expect(html).toContain('XXui.notesXX');
        expect(html).toContain('XXui.note_titleXX');
        expect(html).toContain('XXui.note_textXX');
        expect(html).toContain('XXui.add_noteXX');
        expect(html).toContain('XXui.deleteXX');

        const empty = renderToStaticMarkup(
            <PlayerNotes
                ui={ui}
                notes={[]}
                onWrite={() => {}}
                onDelete={() => {}}
            />
        );
        expect(empty).toContain('XXui.no_notesXX');
        expect(empty).not.toContain('No notes yet');
    });

    it('PauseMenu title and quit button', () => {
        const html = renderToStaticMarkup(
            <PauseMenu
                ui={ui}
                onResume={() => {}}
                onSave={() => {}}
                onLoad={() => {}}
                onSettings={() => {}}
                onQuitToTitle={() => {}}
            />
        );
        expect(html).toContain('XXui.pausedXX');
        expect(html).toContain('XXui.quit_to_titleXX');
    });

    it('SettingsPanel headings, sliders, and back button', () => {
        const html = renderToStaticMarkup(
            <SettingsPanel
                ui={ui}
                audio={audio}
                availableLocales={[
                    { code: 'en', label: 'English' },
                    { code: 'es', label: 'Espanol' },
                ]}
                currentLocale="en"
                onLocaleChange={() => {}}
                onBack={() => {}}
            />
        );
        expect(html).toContain('XXui.settingsXX');
        expect(html).toContain('XXui.audioXX');
        expect(html).toContain('XXui.languageXX');
        expect(html).toContain('XXui.volume_masterXX');
        expect(html).toContain('XXui.backXX');
    });

    it('GameTime narrative format', () => {
        const html = renderToStaticMarkup(
            <GameTime ui={ui} time={{ day: 3, hour: 9 }} format="narrative" />
        );
        expect(html).toContain('XXui.time_morningXX');
        expect(html).toContain('3'); // the day number still appears
    });

    it('every default English label has a ui key', () => {
        const english = buildUIStrings({});
        for (const key of [
            'ui.characters',
            'ui.party',
            'ui.resources',
            'ui.paused',
            'ui.quit_to_title',
            'ui.travel',
            'ui.cancel',
            'ui.skip',
            'ui.menu',
            'ui.saved',
            'ui.no_saves',
        ]) {
            expect(english[key], key).toBeTruthy();
        }
    });

    it('SplashScreen skip aria-label', () => {
        const html = renderToStaticMarkup(
            <SplashScreen ui={ui} onComplete={() => {}} />
        );
        expect(html).toContain('XXui.skip_splashXX');
        expect(html).not.toContain('Skip splash screen');
    });

    it('LocationView empty-banner label', () => {
        const html = renderToStaticMarkup(
            <LocationView
                ui={ui}
                location={{
                    id: 'town',
                    name: 'Town',
                    description: '',
                    banner: '',
                }}
            />
        );
        expect(html).toContain('XXui.location_bannerXX');
        expect(html).not.toContain('Location Banner');
    });

    it.each([
        ['loading-shell', 'ui.loading', 'Loading...'],
        ['loading-game', 'ui.loading_game_assets', 'Loading game assets...'],
        ['complete', 'ui.ready', 'Ready!'],
        ['error', 'ui.error_loading_assets', 'Error loading assets'],
    ] as const)('LoadingScreen %s label', (phase, key, english) => {
        const html = renderToStaticMarkup(
            <LoadingScreen
                ui={ui}
                state={{
                    phase,
                    bytesLoaded: 0,
                    bytesTotal: 0,
                    assetsLoaded: 0,
                    assetsTotal: 0,
                    progress: 0,
                    overallProgress: 0,
                    currentAsset: null,
                    error: null,
                }}
            />
        );
        expect(html).toContain(`XX${key}XX`);
        expect(html).not.toContain(english);
    });
});
