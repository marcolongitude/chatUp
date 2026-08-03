import React from "react";
import {
	ContactItem,
	AvatarContainer,
	AvatarImage,
	AvatarText,
	ContactInfo,
	ContactDetails,
	ContactName,
	UnreadBadge,
	UnreadCount,
} from "./styled";

interface ContactListItemProps {
	contact: {
		id: string;
		name: string;
		avatar?: string;
		unreadCount?: number;
	};
	onPress: () => void;
}

export function ContactListItem({ contact, onPress }: ContactListItemProps) {
	const initials = contact.name
		? contact.name
				.split(" ")
				.map((n: string) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: "??";

	const avatarUri = contact.avatar?.trim() || undefined;

	return (
		<ContactItem
			onPress={onPress}
			activeOpacity={0.7}
			testID={`e2e.contact.${contact.id}`}
			accessibilityLabel={`e2e.contact.${contact.name}`}
		>
			<AvatarContainer>
				{avatarUri ? (
					<AvatarImage
						source={{ uri: avatarUri }}
						contentFit="cover"
						cachePolicy="memory-disk"
						transition={150}
					/>
				) : (
					<AvatarText>{initials}</AvatarText>
				)}
			</AvatarContainer>
			<ContactInfo>
				<ContactDetails>
					<ContactName testID={`e2e.contact.name.${contact.id}`}>{contact.name}</ContactName>
				</ContactDetails>
				{contact.unreadCount && contact.unreadCount > 0 ? (
					<UnreadBadge>
						<UnreadCount>{contact.unreadCount > 99 ? "99+" : contact.unreadCount}</UnreadCount>
					</UnreadBadge>
				) : null}
			</ContactInfo>
		</ContactItem>
	);
}
