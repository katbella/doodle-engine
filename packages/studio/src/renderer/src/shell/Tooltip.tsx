import {
    cloneElement,
    useEffect,
    useId,
    useRef,
    useState,
    type ReactElement,
} from 'react';

const HOVER_DELAY_MS = 450;

export function Tooltip({
    label,
    shortcut,
    children,
}: {
    label: string;
    shortcut?: string;
    children: ReactElement<{ 'aria-describedby'?: string }>;
}) {
    const id = useId();
    const [open, setOpen] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const describedBy = [children.props['aria-describedby'], id]
        .filter(Boolean)
        .join(' ');

    const cancelTimer = () => {
        if (!timerRef.current) return;
        clearTimeout(timerRef.current);
        timerRef.current = null;
    };
    const showAfterDelay = () => {
        cancelTimer();
        timerRef.current = setTimeout(() => {
            setOpen(true);
            timerRef.current = null;
        }, HOVER_DELAY_MS);
    };
    const hide = () => {
        cancelTimer();
        setOpen(false);
    };

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') hide();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open]);

    useEffect(() => () => cancelTimer(), []);

    return (
        <span
            className="tooltip"
            onPointerEnter={showAfterDelay}
            onPointerLeave={hide}
            onFocus={() => {
                cancelTimer();
                setOpen(true);
            }}
            onBlur={hide}
        >
            {cloneElement(children, { 'aria-describedby': describedBy })}
            <span
                id={id}
                role="tooltip"
                aria-hidden={!open}
                className={`tooltip__bubble ${open ? 'tooltip__bubble--open' : ''}`}
            >
                <span>{label}</span>
                {shortcut && <kbd>{shortcut}</kbd>}
            </span>
        </span>
    );
}
