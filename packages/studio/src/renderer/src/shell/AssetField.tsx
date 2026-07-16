import { useState } from 'react';
import type { StudioAssetKind } from '../../../shared/project';
import { FolderOpen } from '../lib/icons';

export function AssetField({
    label,
    name,
    value,
    projectDir,
    kind,
    placeholder = '(none)',
    hint,
    onChange,
    onPick = onChange,
}: {
    label: React.ReactNode;
    name: string;
    value: string;
    projectDir: string;
    kind: StudioAssetKind;
    placeholder?: string;
    hint?: string;
    onChange: (value: string) => void;
    onPick?: (value: string) => void;
}) {
    const [choosing, setChoosing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const choose = async () => {
        setChoosing(true);
        setError(null);
        try {
            const selected = await window.studio.importAsset(projectDir, kind);
            if (selected) onPick(selected);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        } finally {
            setChoosing(false);
        }
    };

    return (
        <div className="field">
            {typeof label === 'string' ? (
                <span className="field__label">{label}</span>
            ) : (
                label
            )}
            <div className="asset-field">
                <input
                    className="dlg__input mono"
                    aria-label={name}
                    value={value}
                    placeholder={placeholder}
                    spellCheck={false}
                    onChange={(event) => onChange(event.target.value)}
                />
                <button
                    className="btn asset-field__choose"
                    type="button"
                    disabled={choosing}
                    aria-label={`Choose ${name} file`}
                    onClick={() => void choose()}
                >
                    <FolderOpen size={14} aria-hidden />
                    {choosing ? 'Choosing…' : 'Choose file…'}
                </button>
            </div>
            {hint && <span className="field__hint">{hint}</span>}
            {error && <span className="field__error">{error}</span>}
        </div>
    );
}
