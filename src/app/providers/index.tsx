import React, { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/app/config/queryClient';
import { ThemeProvider } from './theme';
import { I18nProvider } from './i18n';
import { ElectricProvider } from './electric';
import { CryptoLoadingProvider } from '@/shared/ui';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Compositor de Provedores Globais
 * Centraliza todos os providers do App em um único componente
 */
export const Providers = ({ children }: ProvidersProps) => {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <ThemeProvider>
          <CryptoLoadingProvider>
            <QueryClientProvider client={queryClient}>
              <ElectricProvider>
                {children}
              </ElectricProvider>
            </QueryClientProvider>
          </CryptoLoadingProvider>
        </ThemeProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
};
