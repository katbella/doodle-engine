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
    className = '',
}: SettingsPanelProps) {
    return (
        <div className={`settings-panel ${className}`}>
            <h2 className="settings-title">Settings</h2>

            <div className="settings-section">
                <h3>Audio</h3>
                <VolumeSlider
                    label="Master"
                    value={audio.masterVolume}
                    onChange={audio.setMasterVolume}
                />
                <VolumeSlider
                    label="Music"
                    value={audio.musicVolume}
                    onChange={audio.setMusicVolume}
                />
                <VolumeSlider
                    label="Sound Effects"
                    value={audio.soundVolume}
                    onChange={audio.setSoundVolume}
                />
                <VolumeSlider
                    label="Voice"
                    value={audio.voiceVolume}
                    onChange={audio.setVoiceVolume}
                />
                {uiSoundControls && (
                    <VolumeSlider
                        label="UI Sounds"
                        value={uiSoundControls.volume}
                        onChange={uiSoundControls.setVolume}
                    />
                )}
            </div>

            {availableLocales &&
                availableLocales.length > 1 &&
                onLocaleChange && (
                    <div className="settings-section">
                        <h3>Language</h3>
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
                Back
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
