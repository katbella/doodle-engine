/**
 * SettingsPanel - Volume controls and language selection
 */

import type { UISoundControls } from '../hooks/useUISounds';

export interface SettingsPanelAudio {
    masterVolume: number;
    musicVolume: number;
    soundVolume: number;
    voiceVolume: number;
    setMasterVolume: (v: number) => void;
    setMusicVolume: (v: number) => void;
    setSoundVolume: (v: number) => void;
    setVoiceVolume: (v: number) => void;
}

export interface SettingsPanelProps {
    /** Audio state and controls */
    audio: SettingsPanelAudio;
    /** UI sound controls */
    uiSoundControls?: UISoundControls;
    /** Available languages */
    availableLocales?: { code: string; label: string }[];
    /** Current language code */
    currentLocale?: string;
    /** Language change handler */
    onLocaleChange?: (locale: string) => void;
    /** Go back / close settings */
    onBack: () => void;
    /** Resolved UI strings from snapshot.ui; English defaults when absent. */
    ui?: Record<string, string>;
    /** CSS class */
    className?: string;
}

export function SettingsPanel({
    audio,
    uiSoundControls,
    availableLocales,
    currentLocale,
    onLocaleChange,
    onBack,
    ui,
    className = '',
}: SettingsPanelProps) {
    return (
        <div className={`settings-panel ${className}`}>
            <h2 className="settings-title">
                {ui?.['ui.settings'] ?? 'Settings'}
            </h2>

            <div className="settings-section">
                <h3>{ui?.['ui.audio'] ?? 'Audio'}</h3>
                <VolumeSlider
                    label={ui?.['ui.volume_master'] ?? 'Master'}
                    value={audio.masterVolume}
                    onChange={audio.setMasterVolume}
                />
                <VolumeSlider
                    label={ui?.['ui.volume_music'] ?? 'Music'}
                    value={audio.musicVolume}
                    onChange={audio.setMusicVolume}
                />
                <VolumeSlider
                    label={ui?.['ui.volume_sound'] ?? 'Sound Effects'}
                    value={audio.soundVolume}
                    onChange={audio.setSoundVolume}
                />
                <VolumeSlider
                    label={ui?.['ui.volume_voice'] ?? 'Voice'}
                    value={audio.voiceVolume}
                    onChange={audio.setVoiceVolume}
                />
                {uiSoundControls && (
                    <VolumeSlider
                        label={ui?.['ui.volume_ui'] ?? 'UI Sounds'}
                        value={uiSoundControls.volume}
                        onChange={uiSoundControls.setVolume}
                    />
                )}
            </div>

            {availableLocales &&
                availableLocales.length > 1 &&
                onLocaleChange && (
                    <div className="settings-section">
                        <h3>{ui?.['ui.language'] ?? 'Language'}</h3>
                        <select
                            className="settings-locale-select"
                            value={currentLocale}
                            onChange={(e) => onLocaleChange(e.target.value)}
                        >
                            {availableLocales.map((locale) => (
                                <option key={locale.code} value={locale.code}>
                                    {locale.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

            <button className="settings-back-button" onClick={onBack}>
                {ui?.['ui.back'] ?? 'Back'}
            </button>
        </div>
    );
}

function VolumeSlider({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
}) {
    return (
        <div className="volume-slider">
            <label className="volume-label">{label}</label>
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="volume-input"
            />
        </div>
    );
}
