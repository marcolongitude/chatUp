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
 * Ordem dos providers é importante - providers externos primeiro
 */
export const Providers = ({ children }: ProvidersProps) => {
  console.log("🔍 Providers: Renderizando providers...");
  
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

// Default export para evitar que Expo Router trate este arquivo como rota
// Este arquivo não deve ser usado como rota, apenas como provider
// Retorna um componente vazio caso Expo Router tente renderizá-lo
const ProvidersRoute = () => null;
export default ProvidersRoute;
