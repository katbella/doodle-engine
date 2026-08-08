// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { DialogueBox } from '../components/DialogueBox';

afterEach(cleanup);

const dialogue = {
    speaker: 'narrator',
    speakerName: 'Narrator',
    text: 'A long passage of dialogue.',
    portrait: '',
};

describe('DialogueBox keyboard scrolling', () => {
    it('scrolls an overflowing dialogue with directional keys', () => {
        const { container } = render(<DialogueBox dialogue={dialogue} />);
        const scroll = container.querySelector(
            '.dialogue-box'
        ) as HTMLDivElement;
        Object.defineProperties(scroll, {
            clientHeight: { configurable: true, value: 100 },
            scrollHeight: { configurable: true, value: 300 },
        });

        fireEvent.keyDown(document.body, { key: 'ArrowDown' });
        expect(scroll.scrollTop).toBe(80);

        fireEvent.keyDown(document.body, { key: 'ArrowUp' });
        expect(scroll.scrollTop).toBe(0);
    });

    it('is focusable and labelled by the dialogue speaker', () => {
        const { container } = render(<DialogueBox dialogue={dialogue} />);
        const scroll = container.querySelector(
            '.dialogue-box'
        ) as HTMLDivElement;
        const speaker = container.querySelector(
            '.dialogue-speaker'
        ) as HTMLDivElement;

        expect(scroll.tabIndex).toBe(0);
        expect(scroll.getAttribute('aria-labelledby')).toBe(speaker.id);
    });

    it('resets to the top when the dialogue changes', () => {
        const { container, rerender } = render(
            <DialogueBox dialogue={dialogue} />
        );
        const scroll = container.querySelector(
            '.dialogue-box'
        ) as HTMLDivElement;
        scroll.scrollTop = 120;

        rerender(
            <DialogueBox
                dialogue={{ ...dialogue, text: 'The next passage.' }}
            />
        );

        expect(scroll.scrollTop).toBe(0);
    });
});
