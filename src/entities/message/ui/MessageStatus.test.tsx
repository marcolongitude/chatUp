import React from "react";
import { render } from "@testing-library/react-native";
import { ThemeProvider } from "styled-components/native";
import { darkTheme } from "@/app/providers/theme";
import { MessageStatus } from "./MessageStatus";

function renderStatus(
	props: React.ComponentProps<typeof MessageStatus>
): ReturnType<typeof render> {
	return render(
		<ThemeProvider theme={darkTheme}>
			<MessageStatus {...props} />
		</ThemeProvider>
	);
}

describe("MessageStatus", () => {
	it("exposes e2e testIDs keyed by message for each delivery state", () => {
		for (const status of ["pending", "sent", "delivered", "read", "failed"] as const) {
			const { getByTestId, unmount } = renderStatus({
				status,
				isOwn: true,
				e2eKey: "E2E-notif-abc",
			});
			expect(getByTestId(`e2e.message.status.E2E-notif-abc.${status}`)).toBeTruthy();
			unmount();
		}
	});

	it("uses on-own read accent distinct from bubble primary", () => {
		const { UNSAFE_getByType } = renderStatus({ status: "read", isOwn: true, e2eKey: "x" });
		const Ionicons = require("@expo/vector-icons").Ionicons;
		const icon = UNSAFE_getByType(Ionicons);
		expect(icon.props.color).toBe("#FFE082");
		expect(icon.props.color).not.toBe(darkTheme.colors.button.primary);
	});

	it("falls back to read when legacy flags are set", () => {
		const { getByTestId } = renderStatus({ isRead: true, isOwn: true, e2eKey: "legacy" });
		expect(getByTestId("e2e.message.status.legacy.read")).toBeTruthy();
	});
});
