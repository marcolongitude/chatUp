import { useState, useCallback } from 'react';
// Usando o axiosClient do shared
import { axiosInstance } from '@/shared/api';

export interface SearchedUser {
    id: string;
    email: string;
    displayName: string;
    photoURL?: string;
    bio?: string;
}

/**
 * Hook de domínio para buscar usuários
 */
export function useUserSearch() {
    const [results, setResults] = useState<SearchedUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const search = useCallback(async (query: string) => {
        if (!query || query.trim().length < 2) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await axiosInstance.get<SearchedUser[]>(`/users/search`, {
                params: { q: query }
            });
            setResults(response.data);
        } catch (err: any) {
            console.error('❌ [Entities/Contact] Error searching users:', err);
            setError('Falha ao buscar usuários');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        results,
        isLoading,
        error,
        search,
        clearResults: () => setResults([]),
    };
}
