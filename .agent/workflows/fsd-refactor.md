---
description: Refatorar uma feature para seguir o padrão Feature-Sliced Design (FSD) completo
---

# Refatoração de Feature para FSD

Este workflow documenta o processo de refatoração de uma feature para seguir completamente o padrão Feature-Sliced Design.

## Pré-requisitos

- A feature já deve existir em `src/features/<feature-name>/`
- Identificar quais slices (sub-features) existem dentro da feature

## Anatomia de um Slice FSD

Cada slice dentro de uma feature pode ter as seguintes camadas (apenas as necessárias):

```
src/features/<feature-name>/<slice-name>/
├── index.ts        # Re-exports públicos do slice
├── api/            # Chamadas de API específicas do slice
│   └── <slice>.api.ts
├── lib/            # Helpers, utils, lógica auxiliar
│   └── <helper>.ts
├── model/          # Hooks, stores, lógica de estado
│   └── use-<slice>.ts
├── ui/             # Componentes visuais
│   └── <Component>.tsx
└── config/         # Constantes, configurações (opcional)
    └── constants.ts
```

> **Regra:** Não crie pastas vazias. Se uma camada não é necessária, não a crie.

---

## Passos da Refatoração

### 1. Análise Inicial

```bash
# Listar estrutura atual da feature
find src/features/<feature-name> -type f -name "*.ts" -o -name "*.tsx" | sort

# Identificar pastas vazias
find src/features/<feature-name> -empty -type d
```

// turbo

### 2. Identificar APIs em Shared

Verificar se existem APIs centralizadas em `shared/api/` que pertencem a esta feature:

```bash
grep -r "<feature-name>" src/shared/api/
```

// turbo

### 3. Criar Arquivos de API

Para cada slice que faz chamadas de rede:

**Padrão de nomenclatura:** `<slice-name>.api.ts`

```typescript
// src/features/<feature-name>/<slice-name>/api/<slice-name>.api.ts

import { axiosInstance } from '@/shared/api/axiosClient';
import type { RequestType, ResponseType } from '../../model/types';

/**
 * Descrição da operação
 */
export async function <operacao>Api(data: RequestType): Promise<ResponseType> {
  const response = await axiosInstance.post('/endpoint', data);
  return response.data;
}
```

### 4. Extrair Lógica para Lib

Mover lógica reutilizável ou complexa dos hooks para `lib/`:

- Inicializações (crypto, analytics, etc.)
- Transformações de dados
- Validações customizadas
- Cleanup/teardown

**Padrão:**

```typescript
// src/features/<feature-name>/<slice-name>/lib/<helper-name>.ts

/**
 * Descrição do helper
 */
export async function doSomething(param: string): Promise<void> {
  // Lógica extraída do hook
}
```

### 5. Atualizar Hooks

Modificar os hooks em `model/` para usar os novos módulos locais:

```typescript
// ANTES
import { someService } from "@/shared/api/some.service";
import { helperFunction } from "@/shared/lib/helpers";

// DEPOIS
import { someApi } from "../api/some.api";
import { helperFunction } from "../lib/helper";
```

### 6. Atualizar Exports

Verificar se o `index.ts` de cada slice exporta os módulos públicos:

```typescript
// src/features/<feature-name>/<slice-name>/index.ts

export { useSomeSlice } from './model/use-some-slice';
export { SomeComponent } from './ui/SomeComponent';
// Geralmente NÃO exportamos api/ e lib/ - são internos ao slice
```

### 7. Limpar Shared

Se APIs foram migradas de `shared/api/`:

1. Comentar ou remover o export do `shared/api/index.ts`
2. Manter o arquivo original por um período (deprecated) ou deletar se não há outros consumidores

```bash
# Verificar se ainda há consumidores
grep -r "<service-name>" src/ --include="*.ts" --include="*.tsx"
```

// turbo

### 8. Remover Pastas Vazias

```bash
# Listar pastas vazias
find src/features/<feature-name> -empty -type d

# Remover (após confirmação)
find src/features/<feature-name> -empty -type d -delete
```

### 9. Verificação

```bash
# Verificar erros de TypeScript
npx tsc --noEmit 2>&1 | grep -i "features/<feature-name>"
```

// turbo

---

## Regras Importantes

### ✅ Fazer

- Manter cada slice com responsabilidade única
- Usar imports relativos dentro do slice (`../api/`, `./ui/`)
- Documentar APIs e helpers com JSDoc
- Manter o `index.ts` do slice limpo (apenas re-exports)

### ❌ Evitar

- Criar pastas vazias "por precaução"
- Exportar internals (api/, lib/) no index público
- Deixar código duplicado entre slices
- Criar camadas desnecessárias (ex: config/ se não há constantes)

---

## Checklist de Conclusão

- [ ] APIs migradas de shared para slice/api
- [ ] Lógica auxiliar extraída para slice/lib
- [ ] Hooks atualizados para usar módulos locais
- [ ] Exports atualizados no index.ts
- [ ] Shared api limpo (exports removidos/comentados)
- [ ] Pastas vazias removidas
- [ ] TypeScript sem erros
- [ ] Funcionalidade testada manualmente
