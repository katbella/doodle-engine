import { useState } from 'react';
import type { NewProjectOptions } from '../../../shared/project';

export function NewProjectModal({
    onCreate,
    onCancel,
}: {
    onCreate: (options: NewProjectOptions) => void;
    onCancel: () => void;
}) {
    const [name, setName] = useState('');
    const [targetDir, setTargetDir] = useState('');
    const [useDefaultRenderer, setUseDefaultRenderer] = useState(true);
    const [useStarterStyles, setUseStarterStyles] = useState(true);

    const chooseDir = async () => {
        const dir = await window.studio.chooseDirectory();
        if (dir) setTargetDir(dir);
    };

    const valid = name.trim().length > 0 && targetDir.length > 0;

    return (
        <div className="modal-backdrop" onClick={onCancel}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal__title">New project</div>

                <label className="field">
                    <span className="field__label">Name</span>
                    <input
                        className="field__input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="my-game"
                        autoFocus
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

                <label className="field field--check">
                    <input
                        type="checkbox"
                        checked={useDefaultRenderer}
                        onChange={(e) => setUseDefaultRenderer(e.target.checked)}
                    />
                    <span>Use the default renderer</span>
                </label>

                <label className="field field--check">
                    <input
                        type="checkbox"
                        checked={useStarterStyles}
                        disabled={!useDefaultRenderer}
                        onChange={(e) => setUseStarterStyles(e.target.checked)}
                    />
                    <span>Include starter styles</span>
                </label>

                <div className="modal__actions">
                    <button className="btn" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        className="btn btn--accent"
                        disabled={!valid}
                        onClick={() =>
                            onCreate({
                                name: name.trim(),
                                targetDir,
                                useDefaultRenderer,
                                useStarterStyles,
                            })
                        }
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
}
