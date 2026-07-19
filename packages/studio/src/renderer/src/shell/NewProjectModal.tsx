import { useState } from 'react';
import type { NewProjectOptions } from '../../../shared/project';
import { useModalDismiss } from '../lib/useModalDismiss';
import { OverlayPortal } from './OverlayPortal';

export function NewProjectModal({
    onCreate,
    onCancel,
    error,
    onClearError,
}: {
    onCreate: (options: NewProjectOptions) => void | Promise<void>;
    onCancel: () => void;
    error?: string | null;
    onClearError?: () => void;
}) {
    useModalDismiss(onCancel);
    const [name, setName] = useState('');
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [targetDir, setTargetDir] = useState('');
    const [useDefaultRenderer, setUseDefaultRenderer] = useState(true);
    const [useStarterStyles, setUseStarterStyles] = useState(true);
    const [localizationMode, setLocalizationMode] =
        useState<NewProjectOptions['localizationMode']>('literal');
    const [destinationError, setDestinationError] = useState<string | null>(
        null
    );
    const [checkingDestination, setCheckingDestination] = useState(false);

    const clearError = () => {
        setDestinationError(null);
        onClearError?.();
    };

    const chooseDir = async () => {
        const dir = await window.studio.chooseDirectory();
        if (dir) {
            setTargetDir(dir);
            clearError();
        }
    };

    const valid =
        name.trim().length > 0 &&
        title.trim().length > 0 &&
        targetDir.length > 0;

    const create = async () => {
        if (!valid || checkingDestination) return;
        setCheckingDestination(true);
        setDestinationError(null);
        try {
            const trimmedName = name.trim();
            const status = await window.studio.checkProjectDestination(
                targetDir,
                trimmedName
            );
            if (!status.available) {
                setDestinationError(
                    status.message ?? 'Choose another project name.'
                );
                return;
            }
            await onCreate({
                name: trimmedName,
                title: title.trim(),
                subtitle: subtitle.trim(),
                targetDir,
                useDefaultRenderer,
                useStarterStyles,
                localizationMode,
            });
        } catch (checkError) {
            setDestinationError(
                checkError instanceof Error
                    ? checkError.message
                    : String(checkError)
            );
        } finally {
            setCheckingDestination(false);
        }
    };

    return (
        <OverlayPortal>
            <div className="modal-backdrop" onClick={onCancel}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal__title">New project</div>

                    {(destinationError || error) && (
                        <div className="modal__error" role="alert">
                            {destinationError || error}
                        </div>
                    )}

                    <label className="field">
                        <span className="field__label">Name</span>
                        <input
                            className="field__input"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                clearError();
                            }}
                            placeholder="my-game"
                            autoFocus
                        />
                    </label>

                    <label className="field">
                        <span className="field__label">Game title</span>
                        <input
                            className="field__input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="My Great Adventure"
                        />
                    </label>

                    <label className="field">
                        <span className="field__label">Subtitle</span>
                        <input
                            className="field__input"
                            value={subtitle}
                            onChange={(e) => setSubtitle(e.target.value)}
                            placeholder="Optional"
                        />
                    </label>

                    <div className="field">
                        <span className="field__label">Location</span>
                        <div className="field__row">
                            <span className="field__value mono">
                                {targetDir || 'No folder chosen'}
                            </span>
                            <button className="btn" onClick={chooseDir}>
                                Choose…
                            </button>
                        </div>
                    </div>

                    <label className="field">
                        <span className="field__label">Localization</span>
                        <select
                            className="field__input"
                            value={localizationMode}
                            onChange={(event) =>
                                setLocalizationMode(
                                    event.target
                                        .value as NewProjectOptions['localizationMode']
                                )
                            }
                        >
                            <option value="literal">
                                English text with a locale starter file
                            </option>
                            <option value="localized">
                                English and Swedish localization example
                            </option>
                        </select>
                    </label>

                    <label className="field field--check">
                        <input
                            type="checkbox"
                            checked={useDefaultRenderer}
                            onChange={(e) =>
                                setUseDefaultRenderer(e.target.checked)
                            }
                        />
                        <span>Use the default renderer</span>
                    </label>

                    <label className="field field--check">
                        <input
                            type="checkbox"
                            checked={useStarterStyles}
                            disabled={!useDefaultRenderer}
                            onChange={(e) =>
                                setUseStarterStyles(e.target.checked)
                            }
                        />
                        <span>Include starter styles</span>
                    </label>

                    <div className="modal__actions">
                        <button className="btn" onClick={onCancel}>
                            Cancel
                        </button>
                        <button
                            className="btn btn--accent"
                            disabled={!valid || checkingDestination}
                            onClick={create}
                        >
                            {checkingDestination ? 'Checking…' : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        </OverlayPortal>
    );
}
