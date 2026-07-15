// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
    AudioSettingsProvider,
    useAudioSettings,
} from '../AudioSettingsContext';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

function Controls() {
    const audio = useAudioSettings();
    return (
        <div>
            <output>
                {audio.masterVolume},{audio.musicVolume},{audio.soundVolume},
                {audio.voiceVolume}
            </output>
            <button onClick={() => audio.setMasterVolume(0.1)}>Master</button>
            <button onClick={() => audio.setMusicVolume(0.2)}>Music</button>
            <button onClick={() => audio.setSoundVolume(0.3)}>Sound</button>
            <button onClick={() => audio.setVoiceVolume(0.4)}>Voice</button>
        </div>
    );
}

describe('AudioSettingsProvider interactions', () => {
    it('updates every channel and persists the complete current state', async () => {
        const user = userEvent.setup();
        render(
            <AudioSettingsProvider>
                <Controls />
            </AudioSettingsProvider>
        );

        await user.click(screen.getByRole('button', { name: 'Master' }));
        await user.click(screen.getByRole('button', { name: 'Music' }));
        await user.click(screen.getByRole('button', { name: 'Sound' }));
        await user.click(screen.getByRole('button', { name: 'Voice' }));

        expect(screen.getByText('0.1,0.2,0.3,0.4')).toBeTruthy();
        expect(
            JSON.parse(localStorage.getItem('doodle-engine-audio')!)
        ).toEqual({
            masterVolume: 0.1,
            musicVolume: 0.2,
            soundVolume: 0.3,
            voiceVolume: 0.4,
        });
    });

    it('continues updating when storage is unavailable', async () => {
        const setItem = vi
            .spyOn(Storage.prototype, 'setItem')
            .mockImplementation(() => {
                throw new Error('storage disabled');
            });
        const user = userEvent.setup();
        render(
            <AudioSettingsProvider>
                <Controls />
            </AudioSettingsProvider>
        );

        await user.click(screen.getByRole('button', { name: 'Master' }));
        expect(screen.getByText('0.1,0.7,0.8,1')).toBeTruthy();
        setItem.mockRestore();
    });

    it('rejects use outside its provider', () => {
        expect(() => render(<Controls />)).toThrow(
            'useAudioSettings must be used within AudioSettingsProvider'
        );
    });
});
