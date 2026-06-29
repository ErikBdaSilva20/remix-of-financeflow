## Passo a Passo — Rodando a Migration

### O que a migration faz

O arquivo `supabase/migrations/0002_add_customer_job_type.sql` adiciona a coluna `job_type TEXT` à tabela `customers`. É idempotente: usar `ADD COLUMN IF NOT EXISTS` garante que rodar duas vezes não gera erro.

---

### Opção A — Docker local (desenvolvimento)

Pré-requisito: Docker rodando com `docker-compose up -d`.

**Verificar se o container está de pé:**

```bash
docker ps | grep masia_local_db_financeflow
```

**Rodar a migration via psql dentro do container:**

```bash
docker exec -i masia_local_db_financeflow \
  psql -U masia -d tenant_local \
  < supabase/migrations/0002_add_customer_job_type.sql
```

**Ou conectar interativamente e colar o SQL:**

```bash
docker exec -it masia_local_db_financeflow psql -U masia -d tenant_local
```

```sql
-- Cole dentro do psql:
ALTER TABLE customers ADD COLUMN IF NOT EXISTS job_type TEXT;
\q
```

**Confirmar que a coluna foi criada:**

```bash
docker exec -i masia_local_db_financeflow \
  psql -U masia -d tenant_local \
  -c "\d customers"
```

Deve aparecer `job_type | text` na lista de colunas.

---

### Opção B — Neon (produção / staging)

Pré-requisito: ter a connection string do Neon. Ela está no painel do projeto em **Connection Details** → **psql**.

Formato da string:

```
postgresql://USUARIO:SENHA@HOST.neon.tech/NOME_DO_BANCO?sslmode=require
```

**Rodar a migration:**

```bash
psql "postgresql://USUARIO:SENHA@HOST.neon.tech/NOME_DO_BANCO?sslmode=require" \
  -f supabase/migrations/0002_add_customer_job_type.sql
```

**Se não tiver `psql` instalado localmente**, instale com:

```bash
# macOS
brew install postgresql

# Ubuntu / WSL
sudo apt install postgresql-client
```

**Confirmar que a coluna foi criada no Neon:**

```bash
psql "postgresql://USUARIO:SENHA@HOST.neon.tech/NOME_DO_BANCO?sslmode=require" \
  -c "\d customers"
```

---

### Após rodar a migration (qualquer ambiente)

O `types.gen.ts` já foi atualizado neste repositório. Nenhuma ação adicional de tipo é necessária — basta fazer `git pull` e o campo `job_type` já estará disponível nos componentes TypeScript.

-- 1. Foco --

# Stories — Gestão de Clientes e Faturas

> **Contexto geral**  
> Em `/receivables` existe o botão **"Nova Fatura"** que abre o `InvoiceDialog`. Esse modal exige um `customer_id`, mas não existe nenhuma tela para criar ou gerenciar clientes. Este documento descreve as stories necessárias para resolver isso, acrescentar campos de perfil ao cliente e permitir alterar o status de faturas.

---

## Índice

| ID    | Story                                                                | Prioridade |
| ----- | -------------------------------------------------------------------- | ---------- |
| US-01 | Área de Gestão de Clientes (listagem + CRUD)                         | Alta       |
| US-02 | Campos adicionais no cadastro de cliente (celular + tipo de serviço) | Alta       |
| US-03 | Criar novo cliente direto do modal "Nova Fatura"                     | Alta       |
| US-04 | Vincular cliente a uma fatura existente no momento do cadastro       | Média      |
| US-05 | Alterar status de uma fatura diretamente na tabela                   | Alta       |

---

## US-01 — Área de Gestão de Clientes

### Descrição

**Como** operador financeiro,  
**Quero** poder criar, listar, editar e excluir clientes,  
**Para que** eu tenha uma base centralizada de clientes que alimente o seletor de clientes no modal de fatura.

### Contexto técnico atual

- Arquivo de repositório: `src/lib/data/customers.repo.ts`  
  Já possui as funções: `listCustomers`, `createCustomer`, `updateCustomer`, `removeCustomer`.
- Schema atual da tabela `customers` (ver `src/lib/data/types.gen.ts`):
  ```ts
  {
    id: string;
    owner_id: string;
    name: string;
    email: string | null;
    address: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  }
  ```
- Não existe nenhuma página ou componente de UI para clientes ainda.

### Critérios de aceite

1. Existe uma rota `/customers` acessível pelo menu lateral.
2. A página exibe uma tabela com os clientes existentes (nome, email, tipo de serviço).
3. Existe um botão **"Novo Cliente"** que abre um modal com o formulário de cadastro.
4. Cada linha da tabela tem ações de **Editar** e **Excluir**.
5. Ao excluir, exibe um diálogo de confirmação antes de prosseguir.
6. Após criar/editar/excluir, a lista atualiza automaticamente sem recarregar a página.
7. Se não houver clientes cadastrados, exibe mensagem de estado vazio com botão para criar.

### Tarefas técnicas

#### 1. Adicionar rota no App

**Arquivo:** `src/App.tsx`

Localizar o bloco de rotas e adicionar:

```tsx
import Customers from '@/pages/Customers';

// Dentro do <Routes>:
<Route
  path="/customers"
  element={
    <DashboardLayout>
      <Customers />
    </DashboardLayout>
  }
/>;
```

#### 2. Adicionar link no menu lateral

**Arquivo:** `src/components/DashboardLayout.tsx`

Localizar o array de itens de navegação e adicionar:

```tsx
{ path: '/customers', label: 'Clientes', icon: <Users className="w-5 h-5" /> }
```

O ícone `Users` já está disponível via `lucide-react`.

#### 3. Criar a página de Clientes

**Arquivo a criar:** `src/pages/Customers.tsx`

Estrutura esperada:

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listCustomers, removeCustomer } from '@/lib/data/customers.repo';
import { Button } from '@/components/ui/button';
import { CustomerDialog } from '@/components/CustomerDialog';
// ... outros imports

export default function Customers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: listCustomers,
  });

  const deleteMutation = useMutation({
    mutationFn: removeCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente removido');
    },
  });

  // Tabela com colunas: Nome, Email, Celular, Tipo de Serviço, Ações
  // Botão "Novo Cliente" no header
  // Modal CustomerDialog para criar/editar
}
```

#### 4. Criar o componente modal de cliente

**Arquivo a criar:** `src/components/CustomerDialog.tsx`

Props esperadas:

```tsx
interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null; // null = criar novo, Customer = editar
  onSuccess?: (customer: Customer) => void; // callback opcional (US-03 usa isso)
}
```

Campos do formulário:
| Campo | Nome no schema | Tipo | Obrigatório |
|-------|---------------|------|-------------|
| Nome | `name` | texto | Sim |
| Email | `email` | email | Não |
| Celular | `phone` | texto | Não |
| Tipo de serviço | `job_type` | texto | Não |
| Endereço | `address` | texto | Não |
| Observações | `notes` | textarea | Não |

> **Atenção — migração de schema necessária para `phone` e `job_type`:**  
> Os campos `phone` e `job_type` **não existem** ainda na tabela `customers` do banco de dados.  
> Antes de implementar, é preciso:
>
> 1. Adicionar as colunas no banco via migration SQL:
>    ```sql
>    ALTER TABLE customers ADD COLUMN phone TEXT;
>    ALTER TABLE customers ADD COLUMN job_type TEXT;
>    ```
> 2. Atualizar `src/lib/data/types.gen.ts` para incluir os novos campos no tipo `Customer.Row`:
>    ```ts
>    phone: string | null;
>    job_type: string | null;
>    ```
> 3. Só então os campos podem ser usados no formulário e enviados via `createCustomer` / `updateCustomer`.

Exemplo de validação com Zod (mesmo padrão do `InvoiceDialog`):

```ts
import * as z from 'zod';

const customerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  job_type: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});
```

Lógica de submit:

```ts
// Criar:
await createCustomer({ name, email, phone, job_type, address, notes });

// Editar (quando props.customer existe):
await updateCustomer(customer.id, { name, email, phone, job_type, address, notes });

// Após sucesso:
queryClient.invalidateQueries({ queryKey: ['customers'] });
onSuccess?.(result); // notifica quem chamou (usado na US-03)
onOpenChange(false);
```

### Definição de pronto

- [ ] Rota `/customers` acessível e com link no menu
- [ ] Listagem carrega clientes do backend
- [ ] CRUD completo funciona (criar, editar, excluir)
- [ ] Sem dados mostra estado vazio com CTA
- [ ] Toast de sucesso/erro em cada operação
- [ ] TypeScript sem erros (`npx tsc --noEmit` passa)

---

## US-02 — Campos adicionais no cadastro de cliente

### Descrição

**Como** operador financeiro,  
**Quero** registrar o número de celular e o tipo de serviço/trabalho de cada cliente,  
**Para que** eu tenha contexto de contato e negócio centralizado ao criar faturas.

### Contexto técnico atual

Os campos `phone` e `job_type` não existem no schema atual. Essa story depende da migração descrita na US-01 (seção "migração de schema").

### Critérios de aceite

1. O formulário de cliente (modal `CustomerDialog`) exibe os campos **Celular** e **Tipo de Serviço**.
2. Ambos os campos são opcionais.
3. Os valores são salvos no banco e exibidos na listagem de clientes.
4. O campo celular aceita qualquer texto (ex: `(11) 99999-9999`) — sem máscara obrigatória por ora.

### Tarefas técnicas

Esta story é implementada junto com a US-01: basta garantir que os campos `phone` e `job_type` estejam no formulário e no payload enviado ao backend.

Exibição na tabela (`Customers.tsx`):

```tsx
<TableCell>{customer.job_type ?? '—'}</TableCell>
<TableCell>{customer.phone ?? '—'}</TableCell>
```

### Definição de pronto

- [ ] Migration SQL executada (colunas existem no banco)
- [ ] `types.gen.ts` atualizado
- [ ] Campos visíveis e funcionais no formulário
- [ ] Valores aparecem na tabela após salvar

---

## US-03 — Criar novo cliente direto do modal "Nova Fatura"

### Descrição

**Como** operador financeiro,  
**Quero** criar um novo cliente sem fechar o modal "Nova Fatura",  
**Para que** eu possa completar o cadastro da fatura sem interromper o fluxo.

### Contexto técnico atual

**Arquivo:** `src/components/InvoiceDialog.tsx`

O campo `customer_id` é um `<Select>` que carrega clientes do banco:

```tsx
const { data: customers } = useQuery({
  queryKey: ['customers'],
  queryFn: () => db.table<Customer>('customers').list(),
});
```

Se não houver clientes, o select fica vazio e o formulário não pode ser enviado (campo obrigatório).

### Critérios de aceite

1. Abaixo (ou ao lado) do select de cliente, existe um link/botão **"+ Novo cliente"**.
2. Clicar nesse botão abre o `CustomerDialog` em modo criação, por cima do `InvoiceDialog`.
3. Após salvar o novo cliente com sucesso, o `CustomerDialog` fecha e:
   - O select de clientes atualiza automaticamente com o novo cliente.
   - O novo cliente já aparece selecionado no campo `customer_id`.
4. O `InvoiceDialog` permanece aberto com todos os campos preenchidos intactos.

### Tarefas técnicas

**Arquivo a modificar:** `src/components/InvoiceDialog.tsx`

Adicionar estado e handler:

```tsx
const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
const queryClient = useQueryClient(); // já existe no arquivo
```

Adicionar botão logo abaixo do `<Select>` de cliente:

```tsx
<FormItem>
  <FormLabel>Cliente</FormLabel>
  <div className="flex items-center gap-2">
    <Select onValueChange={field.onChange} value={field.value}>
      {/* ... conteúdo existente ... */}
    </Select>
    <Button type="button" variant="outline" size="sm" onClick={() => setCustomerDialogOpen(true)}>
      + Novo
    </Button>
  </div>
  <FormMessage />
</FormItem>
```

Renderizar `CustomerDialog` ao final do JSX (antes do fechamento do `<Dialog>`):

```tsx
<CustomerDialog
  open={customerDialogOpen}
  onOpenChange={setCustomerDialogOpen}
  onSuccess={(newCustomer) => {
    // Atualiza a lista de clientes no cache do React Query
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    // Seleciona automaticamente o novo cliente
    form.setValue('customer_id', newCustomer.id);
    setCustomerDialogOpen(false);
  }}
/>
```

> **Dependência:** `CustomerDialog` deve existir antes desta story (US-01).

### Definição de pronto

- [ ] Botão "+ Novo" visível ao lado do select de cliente
- [ ] `CustomerDialog` abre sem fechar o `InvoiceDialog`
- [ ] Após criar o cliente, o select atualiza e o novo cliente fica selecionado
- [ ] `InvoiceDialog` mantém os outros campos preenchidos
- [ ] TypeScript sem erros

---

## US-04 — Vincular cliente a uma fatura existente

### Descrição

**Como** operador financeiro,  
**Quero** poder vincular um cliente recém-cadastrado a uma fatura que já existe no sistema,  
**Para que** eu corrija retroativamente faturas que foram criadas sem cliente.

### Contexto técnico atual

Faturas podem ter `customer_id: null` quando criadas sem cliente. A API de update de faturas existe via:

```ts
db.table('invoices').update(id, { customer_id: newCustomerId });
```

### Critérios de aceite

1. No formulário de criação/edição de cliente (`CustomerDialog`), existe um campo opcional **"Vincular a fatura existente"**.
2. Esse campo é um select que lista faturas abertas (status `Open` ou `Draft`) que não possuem cliente vinculado (ou cujo `customer_id` é nulo).
3. Ao salvar o cliente com uma fatura selecionada, o sistema:
   - Cria/atualiza o cliente.
   - Atualiza o `customer_id` da fatura selecionada com o ID do cliente.
4. O campo é totalmente opcional — não bloqueia o cadastro do cliente.
5. Uma fatura já vinculada a outro cliente **não aparece** no select.

### Tarefas técnicas

**Arquivo a modificar:** `src/components/CustomerDialog.tsx`

Carregar faturas sem cliente:

```tsx
const { data: openInvoices } = useQuery({
  queryKey: ['invoices-without-customer'],
  queryFn: async () => {
    const all = await db.table<Invoice>('invoices').list();
    return all.filter(
      (inv) => !inv.customer_id && (inv.status === 'Open' || inv.status === 'Draft')
    );
  },
});
```

Adicionar campo ao schema Zod:

```ts
const customerSchema = z.object({
  // ... campos existentes ...
  invoice_id: z.string().optional(), // ID da fatura a vincular
});
```

Lógica de submit com vinculação:

```ts
const onSubmit = async (data) => {
  // 1. Criar ou atualizar o cliente
  const customer = await createCustomer({ name: data.name, email: data.email, ... });

  // 2. Vincular fatura se selecionada
  if (data.invoice_id) {
    await db.table('invoices').update(data.invoice_id, { customer_id: customer.id });
    queryClient.invalidateQueries({ queryKey: ['ar-data'] });
  }

  onSuccess?.(customer);
};
```

Campo no formulário JSX:

```tsx
<FormField
  name="invoice_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Vincular a fatura existente (opcional)</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <SelectTrigger>
          <SelectValue placeholder="Nenhuma" />
        </SelectTrigger>
        <SelectContent>
          {openInvoices?.map((inv) => (
            <SelectItem key={inv.id} value={inv.id}>
              Fatura #{inv.id.slice(0, 8)} — {formatCurrency(inv.amount_total)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormItem>
  )}
/>
```

### Definição de pronto

- [ ] Campo "Vincular fatura" aparece no `CustomerDialog`
- [ ] Lista apenas faturas abertas sem cliente
- [ ] Ao salvar, fatura é atualizada com o `customer_id` correto
- [ ] Tabela de faturas em `/receivables` reflete a vinculação imediatamente

---

## US-05 — Alterar status de uma fatura na tabela

### Descrição

**Como** operador financeiro,  
**Quero** alterar o status de uma fatura (ex: de `Open` para `Paid`) diretamente na tabela de faturas,  
**Para que** o estado das contas a receber reflita a realidade sem precisar recriar a fatura.

### Contexto técnico atual

**Arquivo da tabela:** `src/components/ARTable.tsx`  
**Arquivo da página:** `src/pages/Receivables.tsx`

A tabela exibe faturas com status, mas não permite editá-los. O hook de dados:

```ts
// src/hooks/useReceivablesData.ts — useARDetailedData
```

retorna faturas com campo `status: string`.

Os status válidos no schema atual são:

```ts
'Draft' | 'Open' | 'Paid' | 'Overdue' | 'Cancelled';
```

A API de update existe:

```ts
db.table('invoices').update(invoiceId, { status: novoStatus });
```

### Critérios de aceite

1. Na tabela de faturas em `/receivables`, cada linha tem um **badge de status clicável** (ou um select inline).
2. Ao clicar, abre um pequeno dropdown com os status disponíveis.
3. Selecionar um novo status:
   - Chama o update no backend.
   - Exibe toast de sucesso.
   - Atualiza a linha na tabela sem recarregar a página toda.
4. Durante o update, o botão/badge fica desabilitado (estado de loading).
5. Em caso de erro, exibe toast de erro e reverte visualmente.

### Tarefas técnicas

#### 1. Verificar o componente ARTable

**Arquivo:** `src/components/ARTable.tsx`

Verificar quais props ele recebe atualmente. Se a coluna de status não tiver interação, adicionar uma prop de callback:

```tsx
interface ARTableProps {
  data: InvoiceRow[];
  formatCurrency: (amount: number) => string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onStatusChange?: (invoiceId: string, newStatus: string) => void; // NOVO
}
```

#### 2. Adicionar select inline de status no ARTable

Substituir o badge estático de status por um componente interativo:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Na coluna de status:
<Select value={row.status} onValueChange={(newStatus) => props.onStatusChange?.(row.id, newStatus)}>
  <SelectTrigger className="h-7 w-[120px] text-xs border-none shadow-none">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="Draft">Rascunho</SelectItem>
    <SelectItem value="Open">Aberta</SelectItem>
    <SelectItem value="Paid">Paga</SelectItem>
    <SelectItem value="Overdue">Atrasada</SelectItem>
    <SelectItem value="Cancelled">Cancelada</SelectItem>
  </SelectContent>
</Select>;
```

#### 3. Implementar o update na página

**Arquivo:** `src/pages/Receivables.tsx`

Adicionar mutation e handler:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/data/client';
import { toast } from 'sonner';

// Dentro do componente:
const queryClient = useQueryClient();

const updateStatusMutation = useMutation({
  mutationFn: ({ invoiceId, status }: { invoiceId: string; status: string }) =>
    db.table('invoices').update(invoiceId, { status }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['ar-detailed'] });
    queryClient.invalidateQueries({ queryKey: ['ar-data'] });
    toast.success('Status da fatura atualizado');
  },
  onError: () => {
    toast.error('Erro ao atualizar status');
  },
});

const handleStatusChange = (invoiceId: string, newStatus: string) => {
  updateStatusMutation.mutate({ invoiceId, status: newStatus });
};
```

Passar o handler para a tabela:

```tsx
<ARTable
  data={arDetailedResult?.data || []}
  formatCurrency={formatWithCurrency}
  page={arDetailedResult?.page || 1}
  totalPages={arDetailedResult?.totalPages || 1}
  onPageChange={setArPage}
  onStatusChange={handleStatusChange} // NOVO
/>
```

### Definição de pronto

- [ ] Status de cada fatura é alterável via select na tabela
- [ ] Update é enviado ao backend via `db.table('invoices').update(...)`
- [ ] Toast de sucesso aparece após update
- [ ] Tabela reflete o novo status sem reload de página
- [ ] Estado de loading/disabled durante o update

---

## Ordem de implementação recomendada

```
US-01 (CRUD de Clientes)
  └─> US-02 (campos phone + job_type) — implementar junto
        └─> US-03 (criar cliente no modal de fatura)
              └─> US-04 (vincular cliente a fatura existente)

US-05 (alterar status) — independente, pode ser feita a qualquer momento
```

## Arquivos envolvidos (resumo)

| Arquivo                                              | Ação                                                         | Story               |
| ---------------------------------------------------- | ------------------------------------------------------------ | ------------------- |
| `src/App.tsx`                                        | Adicionar rota `/customers`                                  | US-01               |
| `src/components/DashboardLayout.tsx`                 | Adicionar link "Clientes" no menu                            | US-01               |
| `src/pages/Customers.tsx`                            | **Criar** — página de listagem/CRUD                          | US-01               |
| `src/components/CustomerDialog.tsx`                  | **Criar** — modal create/edit cliente                        | US-01, US-02, US-04 |
| `src/components/InvoiceDialog.tsx`                   | Adicionar botão "+ Novo cliente" e `CustomerDialog`          | US-03               |
| `src/components/ARTable.tsx`                         | Adicionar select inline de status                            | US-05               |
| `src/pages/Receivables.tsx`                          | Adicionar mutation de update de status                       | US-05               |
| `src/lib/data/types.gen.ts`                          | Adicionar `job_type` ao tipo `Customer` (phone já existe)    | US-02               |
| `supabase/migrations/0002_add_customer_job_type.sql` | **Criar** — adiciona coluna `job_type` na tabela `customers` | US-02               |

> **Nota:** `phone` já existia na `0001_business_schema.sql` e no `types.gen.ts`. Apenas `job_type` é novo.  
> O `types.gen.ts` já foi atualizado — campo `job_type: string | null` inserido na seção `customers.Row`.

---
