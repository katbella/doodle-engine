import { vi } from 'vitest';

// jsdom deliberately leaves media playback unimplemented. The React suite
// tests our orchestration and event handling, not an audio decoder, so keep
// mounted GameShell journeys quiet and deterministic.
if (typeof HTMLMediaElement !== 'undefined') {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
}
