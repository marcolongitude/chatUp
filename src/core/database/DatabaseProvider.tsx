/**
 * TanStack DB Database Provider
 * Provides database context for useLiveQuery and other TanStack DB hooks
 */

import React, { ReactNode, useMemo } from "react";
import { createDatabase, DatabaseProvider as TanStackDatabaseProvider } from "@tanstack/react-db";

/**
 * Database Provider component
 * Wraps the app to provide TanStack DB context
 * Collections are automatically registered when used in queries via createCollection
 */
export function DatabaseProvider({ children }: { children: ReactNode }) {
	// Create database instance
	// Collections created with createCollection are automatically registered
	const database = useMemo(() => {
		return createDatabase();
	}, []);

	return <TanStackDatabaseProvider database={database}>{children}</TanStackDatabaseProvider>;
}
