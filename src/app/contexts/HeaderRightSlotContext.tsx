/**
 * Contexto para injetar conteúdo no slot direito do Header (FSD: app layer).
 * Permite que páginas (ex: Conversations) mostrem ícone de busca que abre overlay no header.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

type HeaderRightSlotContextValue = {
	content: ReactNode;
	setContent: (node: ReactNode) => void;
};

const HeaderRightSlotContext = createContext<HeaderRightSlotContextValue | null>(null);

export function HeaderRightSlotProvider({ children }: { children: ReactNode }) {
	const [content, setContent] = useState<ReactNode>(null);
	const value: HeaderRightSlotContextValue = { content, setContent };
	return (
		<HeaderRightSlotContext.Provider value={value}>
			{children}
		</HeaderRightSlotContext.Provider>
	);
}

export function useHeaderRightSlot(): HeaderRightSlotContextValue {
	const ctx = useContext(HeaderRightSlotContext);
	if (!ctx) {
		return { content: null, setContent: () => {} };
	}
	return ctx;
}
