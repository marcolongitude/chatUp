import React from "react";
import { FlatList } from "react-native";
import { EmptyContainer, EmptyText } from "./styled";

interface SearchResultsListProps {
	promise: Promise<any[]>;
	renderItem: any;
	keyExtractor: any;
	t: any;
}

export function SearchResultsList({ 
	promise, 
	renderItem, 
	keyExtractor,
	t
}: SearchResultsListProps) {
	const results = React.use(promise);

	return (
		<FlatList
			data={results}
			renderItem={renderItem}
			keyExtractor={keyExtractor}
			contentContainerStyle={results.length === 0 ? { flex: 1 } : undefined}
			ListEmptyComponent={
				<EmptyContainer>
					<EmptyText>{t("conversations.noResultsFound") || "Nenhum usuário encontrado"}</EmptyText>
				</EmptyContainer>
			}
		/>
	);
}
