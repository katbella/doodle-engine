// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetField, AssetListField } from '../AssetField';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

function installBridge(dataUrl: string | null) {
    const readAssetDataUrl = vi.fn(async () => dataUrl);
    Object.defineProperty(window, 'studio', {
        configurable: true,
        value: { importAsset: vi.fn(), readAssetDataUrl },
    });
    return readAssetDataUrl;
}

describe('AssetField', () => {
    it('shows a thumbnail for an image value that resolves', async () => {
        const readAssetDataUrl = installBridge('data:image/png;base64,QQ==');
        const { container } = render(
            <AssetField
                label="Portrait"
                name="Portrait"
                value="hero.png"
                projectDir="C:/story"
                kind="portrait"
                onChange={vi.fn()}
            />
        );
        await waitFor(() => {
            expect(
                container.querySelector('img.asset-field__thumb')
            ).toBeTruthy();
        });
        expect(readAssetDataUrl).toHaveBeenCalledWith(
            'C:/story',
            'portrait',
            'hero.png'
        );
    });

    it('shows a labeled missing state when the image cannot be read', async () => {
        installBridge(null);
        render(
            <AssetField
                label="Banner"
                name="Banner"
                value="gone.png"
                projectDir="C:/story"
                kind="banner"
                onChange={vi.fn()}
            />
        );
        await waitFor(() => {
            expect(
                screen.getByTitle('Could not load gone.png from the project')
            ).toBeTruthy();
        });
    });

    it('renders no thumbnail or player for an empty value', () => {
        installBridge('data:image/png;base64,QQ==');
        const { container } = render(
            <AssetField
                label="Portrait"
                name="Portrait"
                value=""
                projectDir="C:/story"
                kind="portrait"
                onChange={vi.fn()}
            />
        );
        expect(container.querySelector('.asset-field__thumb')).toBeNull();
        expect(container.querySelector('.asset-field__play')).toBeNull();
    });

    it('renders one row per audio entry with play and remove controls', async () => {
        installBridge('data:audio/ogg;base64,QQ==');
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(
            <AssetListField
                label="Sounds"
                name="Sounds"
                values={['clink.ogg', 'door.ogg']}
                projectDir="C:/story"
                kind="sfx"
                onChange={onChange}
            />
        );
        expect(
            screen.getByRole('button', { name: 'Play clink.ogg' })
        ).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Play door.ogg' })
        ).toBeTruthy();
        await user.click(
            screen.getByRole('button', { name: 'Remove clink.ogg' })
        );
        expect(onChange).toHaveBeenCalledWith(['door.ogg']);

        // The trailing blank row adds an entry by typing, like Music/Voice.
        const blank = screen.getByRole('textbox', { name: 'Sounds 2' });
        expect((blank as HTMLInputElement).placeholder).toBe('(none)');
        await user.type(blank, 'w');
        expect(onChange).toHaveBeenCalledWith(['door.ogg', 'w']);
    });

    it('imports a selected asset and reports picker errors', async () => {
        const importAsset = vi
            .fn()
            .mockResolvedValueOnce('picked.ogg')
            .mockRejectedValueOnce(new Error('Picker unavailable'));
        Object.defineProperty(window, 'studio', {
            configurable: true,
            value: { importAsset },
        });
        const onChange = vi.fn();
        const onPick = vi.fn();
        const user = userEvent.setup();
        const view = render(
            <AssetField
                label={<span>Voice</span>}
                name="Voice"
                value=""
                projectDir="C:/story"
                kind="voice"
                hint="Optional narration"
                onChange={onChange}
                onPick={onPick}
            />
        );

        await user.click(
            screen.getByRole('button', { name: 'Choose Voice file' })
        );
        expect(importAsset).toHaveBeenCalledWith('C:/story', 'voice');
        expect(onPick).toHaveBeenCalledWith('picked.ogg');
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByText('Optional narration')).toBeTruthy();

        view.rerender(
            <AssetField
                label="Voice"
                name="Voice"
                value=""
                projectDir="C:/story"
                kind="voice"
                onChange={onChange}
            />
        );
        await user.click(
            screen.getByRole('button', { name: 'Choose Voice file' })
        );
        expect(await screen.findByText('Picker unavailable')).toBeTruthy();
    });

    it('adds a list entry chosen from the project', async () => {
        const importAsset = vi.fn(async () => 'wind.ogg');
        Object.defineProperty(window, 'studio', {
            configurable: true,
            value: { importAsset },
        });
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(
            <AssetListField
                label={<span>Sounds</span>}
                name="Sounds"
                values={['door.ogg']}
                projectDir="C:/story"
                kind="sfx"
                hint="Played together"
                onChange={onChange}
            />
        );

        await user.click(
            screen.getByRole('button', { name: 'Add Sounds file' })
        );
        expect(importAsset).toHaveBeenCalledWith('C:/story', 'sfx');
        expect(onChange).toHaveBeenCalledWith(['door.ogg', 'wind.ogg']);
        expect(screen.getByText('Played together')).toBeTruthy();
    });

    it('plays and stops an audio preview', async () => {
        installBridge('data:audio/ogg;base64,QQ==');
        const instances: Array<{
            pause: ReturnType<typeof vi.fn>;
            onended: (() => void) | null;
        }> = [];
        const play = vi.fn(async () => {});
        vi.stubGlobal(
            'Audio',
            class {
                pause = vi.fn();
                onended: (() => void) | null = null;
                play = play;
                constructor(_url: string) {
                    instances.push(this);
                }
            }
        );
        const user = userEvent.setup();
        render(
            <AssetField
                label="Music"
                name="Music"
                value="theme.ogg"
                projectDir="C:/story"
                kind="music"
                onChange={vi.fn()}
            />
        );

        await user.click(
            screen.getByRole('button', { name: 'Play theme.ogg' })
        );
        expect(play).toHaveBeenCalledOnce();
        await user.click(
            screen.getByRole('button', { name: 'Stop theme.ogg' })
        );
        expect(instances[0].pause).toHaveBeenCalledOnce();
    });

    it('reports missing and unplayable audio previews', async () => {
        const readAssetDataUrl = installBridge(null);
        const user = userEvent.setup();
        const view = render(
            <AssetField
                label="Music"
                name="Music"
                value="missing.ogg"
                projectDir="C:/story"
                kind="music"
                onChange={vi.fn()}
            />
        );

        await user.click(
            screen.getByRole('button', { name: 'Play missing.ogg' })
        );
        expect(
            await screen.findByText(
                'Could not load missing.ogg from the project'
            )
        ).toBeTruthy();

        readAssetDataUrl.mockResolvedValue('data:audio/ogg;base64,QQ==');
        vi.stubGlobal(
            'Audio',
            class {
                pause = vi.fn();
                onended: (() => void) | null = null;
                play = vi.fn(async () => {
                    throw new Error('blocked');
                });
            }
        );
        view.rerender(
            <AssetField
                label="Music"
                name="Music"
                value="blocked.ogg"
                projectDir="C:/story"
                kind="music"
                onChange={vi.fn()}
            />
        );
        await user.click(
            screen.getByRole('button', { name: 'Play blocked.ogg' })
        );
        expect(
            await screen.findByText('Could not play blocked.ogg')
        ).toBeTruthy();
    });
});
