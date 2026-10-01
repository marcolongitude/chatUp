/**
 * Ponto de montagem do app.
 * Garante que Providers e RouterProvider usem o mesmo React/contexto.
 */

import React from "react";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "@/app/navigation/router";
import { Providers } from "@/app/providers";

export function App() {
	return (
		<Providers>
			<RouterProvider router={router} />
		</Providers>
	);
}
