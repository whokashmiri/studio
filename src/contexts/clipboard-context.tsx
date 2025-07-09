
"use client";
import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback } from 'react';

export type ClipboardOperation = 'copy' | 'cut';
export type ClipboardItemType = 'asset' | 'folder';

interface ClipboardState {
  itemId: string | null;
  itemType: ClipboardItemType | null;
  operation: ClipboardOperation | null;
  sourceProjectId: string | null;
}

interface ClipboardContextType {
  clipboardState: ClipboardState;
  setClipboard: (item: { itemId: string; itemType: ClipboardItemType; operation: ClipboardOperation; sourceProjectId: string; }) => void;
  clearClipboard: () => void;
  isItemCut: (itemId: string) => boolean;
}

const ClipboardContext = createContext<ClipboardContextType | undefined>(undefined);

const initialState: ClipboardState = {
  itemId: null,
  itemType: null,
  operation: null,
  sourceProjectId: null,
};

export function ClipboardProvider({ children }: { children: ReactNode }) {
  const [clipboardState, setClipboardState] = useState<ClipboardState>(initialState);

  const setClipboard = useCallback((item: { itemId: string; itemType: ClipboardItemType; operation: ClipboardOperation; sourceProjectId: string; }) => {
    setClipboardState(item);
  }, []);

  const clearClipboard = useCallback(() => {
    setClipboardState(initialState);
  }, []);
  
  const isItemCut = useCallback((itemId: string) => {
    return clipboardState.itemId === itemId && clipboardState.operation === 'cut';
  }, [clipboardState]);

  return (
    <ClipboardContext.Provider value={{ clipboardState, setClipboard, clearClipboard, isItemCut }}>
      {children}
    </ClipboardContext.Provider>
  );
}

export function useClipboard() {
  const context = useContext(ClipboardContext);
  if (context === undefined) {
    throw new Error('useClipboard must be used within a ClipboardProvider');
  }
  return context;
}
