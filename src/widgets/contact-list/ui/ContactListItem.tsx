import React from "react";
import { 
    ContactItem, 
    AvatarContainer, 
    AvatarText, 
    ContactInfo, 
    ContactDetails, 
    ContactName, 
    UnreadBadge, 
    UnreadCount 
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

	return (
		<ContactItem onPress={onPress} activeOpacity={0.7}>
			<AvatarContainer>
				<AvatarText>{initials}</AvatarText>
			</AvatarContainer>
			<ContactInfo>
				<ContactDetails>
					<ContactName>{contact.name}</ContactName>
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
