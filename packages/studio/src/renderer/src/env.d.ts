/// <reference types="vite/client" />

import type { StudioApi } from '../../shared/project';

declare global {
    interface Window {
        studio: StudioApi;
    }
}
