# Login mockado (modo visualização)

> **Status atual: 🟡 MOCK ATIVO** — o app abre direto no dashboard, sem tela de login.
> **Antes de publicar, restaure o login real** (ver [Como restaurar](#como-restaurar-o-login-real)).

---

## Por que existe

O login de verdade é **Better-Auth via tenant-gateway**: o app precisa de um gateway rodando em
`VITE_GATEWAY_URL` para autenticar. Para **visualizar a UI localmente sem subir o gateway**,
mockamos a sessão: injetamos um usuário admin fake e pulamos a autenticação.

## O que o mock faz

- `AuthProvider.loadSession()` (em `src/lib/auth.tsx`) **não chama `auth.me()`**. Em vez disso
  seta direto um usuário fake:
  ```ts
  { id: 'mock-admin', email: 'demo@financeflow.local', name: 'Usuário Demo', role: 'admin' }
  ```
- Como `AuthWrapper` vê um `user` válido, ele renderiza o app direto — **a tela de login
  (`LoginForm`) nunca aparece**.
- O papel é `admin`, então **toda a UI fica visível** (nenhum botão escondido por papel).

## Onde está no código

| Arquivo | O quê |
| --- | --- |
| `src/lib/auth.tsx` → `loadSession` | Bloco `🟡 LOGIN MOCKADO` ativo; bloco `LOGIN REAL` comentado logo abaixo. |

O resto do fluxo de auth (`LoginForm`, `signIn`, `signUp`, `signOut`, `auth.*` do `client.ts`)
**fica intacto** — só não é exercitado enquanto o mock está ligado.

## ⚠️ Limitação importante: isto mocka só o LOGIN, não os DADOS

Mockar o login mostra a **casca do app** (layout, menus, telas). Mas os dados (faturas,
despesas, etc.) são buscados via `db.table().list()` → **gateway real**. Sem gateway, essas
queries falham e as telas ficam **vazias / em loading**.

**Para visualizar COM dados de exemplo**, ligue também o modo PREVIEW (fixtures):

```bash
# .env
VITE_PREVIEW=true
```

O modo PREVIEW (`src/lib/data/client.ts` + `preview-fixtures.ts`) roteia **tanto o auth quanto
os dados** para fixtures locais — ou seja, **com `VITE_PREVIEW=true` o login já fica mockado
sozinho**, sem precisar do mock de código. As duas formas:

| Forma | Mocka login? | Mocka dados? | Quando usar |
| --- | --- | --- | --- |
| **Mock de código** (este doc, `auth.tsx`) | ✅ | ❌ | Ver só a casca; ou quando você tem gateway de dados mas não quer logar. |
| **`VITE_PREVIEW=true`** (oficial) | ✅ | ✅ | Visualização completa com dados de exemplo. **Recomendado.** |

> Se você só quer visualizar, o caminho mais limpo é `VITE_PREVIEW=true` (não exige editar
> código). O mock em `auth.tsx` existe para o caso de querer pular o login mantendo o gateway
> de dados real.

## Comportamento do logout sob o mock

O botão "Sair" chama `auth.signOut()` (gateway real). Sem gateway, ele falha, zera a sessão e
**mostra a tela de login**. Basta **recarregar a página** — o `loadSession` re-injeta o mock e
o app volta. (Em `VITE_PREVIEW=true`, o `signOut` resolve via fixtures sem erro.)

## Como restaurar o login real

Em `src/lib/auth.tsx`, dentro de `loadSession`:

1. **Apague** o bloco `🟡 LOGIN MOCKADO` (o `setState({ user: { id: 'mock-admin', ... } })`).
2. **Descomente** o bloco `LOGIN REAL`:
   ```ts
   try {
     const user = await auth.me();
     setState({ user, isLoading: false, error: null });
   } catch {
     setState({ user: null, isLoading: false, error: null });
   }
   ```

Pronto — o app volta a exigir login de verdade contra o gateway.

> **Checklist de publish:** garanta que o bloco MOCK foi removido e que `VITE_PREVIEW` **não**
> está `true` no build de produção (o gate `import.meta.env.DEV` em `client.ts` já protege contra
> isso, mas confirme).
