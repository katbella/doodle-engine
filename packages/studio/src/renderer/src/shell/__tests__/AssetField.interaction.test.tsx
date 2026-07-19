// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetField, AssetListField } from '../AssetField';

afterEach(cleanup);

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
});
