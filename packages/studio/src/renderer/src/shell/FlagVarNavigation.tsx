import { createContext, useContext, type ReactNode } from 'react';
import type { FlagVarKind } from '../lib/flag-vars';

export type OpenFlagVar = (kind: FlagVarKind, id: string) => void;

const FlagVarNavigationContext = createContext<OpenFlagVar | null>(null);

export function FlagVarNavigationProvider({
    onOpen,
    children,
}: {
    onOpen?: OpenFlagVar;
    children: ReactNode;
}) {
    return (
        <FlagVarNavigationContext.Provider value={onOpen ?? null}>
            {children}
        </FlagVarNavigationContext.Provider>
    );
}

export const useOpenFlagVar = () => useContext(FlagVarNavigationContext);
