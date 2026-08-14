import {
	DEFAULT_PERIMETER_KM,
	isPerimeterKm,
	PERIMETER_OPTIONS_KM,
} from "./perimeter-preference";

describe("perimeter-preference", () => {
	it("exposes only 1, 2 and 3 km options", () => {
		expect(PERIMETER_OPTIONS_KM).toEqual([1, 2, 3]);
	});

	it("defaults to 1 km", () => {
		expect(DEFAULT_PERIMETER_KM).toBe(1);
	});

	it("validates perimeter values", () => {
		expect(isPerimeterKm(1)).toBe(true);
		expect(isPerimeterKm(2)).toBe(true);
		expect(isPerimeterKm(3)).toBe(true);
		expect(isPerimeterKm(0)).toBe(false);
		expect(isPerimeterKm(500)).toBe(false);
		expect(isPerimeterKm("2")).toBe(false);
	});
});
