/**
 * SettingsPanel - Volume controls and language selection
 */

import type { AudioManagerControls } from '../hooks/useAudioManager';
import type { UISoundControls } from '../hooks/useUISounds';

export interface SettingsPanelProps {
    /** Audio manager controls for volume */
    audioControls: AudioManagerControls;
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
    audioControls,
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
                    value={1.0}
                    onChange={audioControls.setMasterVolume}
                />
                <VolumeSlider
                    label="Music"
                    value={0.7}
                    onChange={audioControls.setMusicVolume}
                />
                <VolumeSlider
                    label="Sound Effects"
                    value={0.8}
                    onChange={audioControls.setSoundVolume}
                />
                <VolumeSlider
                    label="Voice"
                    value={1.0}
                    onChange={audioControls.setVoiceVolume}
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
                defaultValue={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="volume-input"
            />
        </div>
    );
}
