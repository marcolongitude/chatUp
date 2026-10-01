import React, { useEffect, useMemo, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from "react-native-maps";
import { useTheme } from "styled-components/native";
import { useTranslation } from "@/app/providers/i18n";
import type { FamilyMapMember } from "@/features/family-map";

interface FamilyMapViewProps {
	members: FamilyMapMember[];
	fallbackLatitude?: number;
	fallbackLongitude?: number;
}

export function FamilyMapView({
	members,
	fallbackLatitude = -23.5505,
	fallbackLongitude = -46.6333,
}: FamilyMapViewProps) {
	const theme = useTheme();
	const { t } = useTranslation();
	const mapRef = useRef<MapView>(null);

	const pins = useMemo(
		() =>
			members.filter(
				(m) =>
					m.locationVisible &&
					typeof m.latitude === "number" &&
					typeof m.longitude === "number" &&
					Number.isFinite(m.latitude) &&
					Number.isFinite(m.longitude),
			),
		[members],
	);

	const graceMembers = useMemo(() => members.filter((m) => m.inGrace && !m.locationVisible), [members]);

	useEffect(() => {
		if (!mapRef.current) return;
		if (pins.length === 0) {
			mapRef.current.animateToRegion(
				{
					latitude: fallbackLatitude,
					longitude: fallbackLongitude,
					latitudeDelta: 0.04,
					longitudeDelta: 0.04,
				} satisfies Region,
				350,
			);
			return;
		}
		if (pins.length === 1) {
			const pin = pins[0];
			mapRef.current.animateToRegion(
				{
					latitude: pin.latitude!,
					longitude: pin.longitude!,
					latitudeDelta: 0.02,
					longitudeDelta: 0.02,
				},
				350,
			);
			return;
		}
		mapRef.current.fitToCoordinates(
			pins.map((p) => ({ latitude: p.latitude!, longitude: p.longitude! })),
			{
				edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
				animated: true,
			},
		);
	}, [pins, fallbackLatitude, fallbackLongitude]);

	return (
		<View style={styles.container} testID="e2e.familyMap.view">
			<MapView
				ref={mapRef}
				style={styles.map}
				provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
				showsUserLocation
				showsMyLocationButton
				initialRegion={{
					latitude: fallbackLatitude,
					longitude: fallbackLongitude,
					latitudeDelta: 0.05,
					longitudeDelta: 0.05,
				}}
			>
				{pins.map((pin) => (
					<Marker
						key={pin.peerId}
						coordinate={{ latitude: pin.latitude!, longitude: pin.longitude! }}
						title={pin.peerName || t("profile.user")}
						description={
							typeof pin.distanceM === "number"
								? t("familyMap.distanceMeters", { meters: pin.distanceM })
								: undefined
						}
					/>
				))}
			</MapView>
			{graceMembers.length > 0 ? (
				<View
					style={[
						styles.banner,
						{
							backgroundColor: theme.colors.background.card,
							borderColor: theme.colors.border.secondary,
						},
					]}
				>
					<Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>
						{t("familyMap.graceBanner", { count: graceMembers.length })}
					</Text>
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	map: {
		...StyleSheet.absoluteFillObject,
	},
	banner: {
		position: "absolute",
		left: 12,
		right: 12,
		bottom: 16,
		padding: 12,
		borderRadius: 10,
		borderWidth: 1,
	},
});
