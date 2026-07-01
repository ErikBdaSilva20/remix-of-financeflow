# Third-Party Notices — FinanceFlow

Este template reutiliza componentes e bibliotecas de código aberto. Todas as
dependências abaixo possuem **licença permissiva** (MIT / ISC / Apache-2.0),
compatível com uso em SaaS multi-tenant gerenciado, conforme §A2 do
`Importantdoc.md`.

## Origem do markup / design system

A camada visual deriva do **shadcn/ui** (componentes em `src/components/ui/**`),
que por sua vez é construído sobre **Radix UI** primitives.

| Projeto    | Licença | Link                                      |
| ---------- | ------- | ----------------------------------------- |
| shadcn/ui  | MIT     | https://github.com/shadcn-ui/ui           |
| Radix UI   | MIT     | https://github.com/radix-ui/primitives    |

## Bibliotecas de runtime (`dependencies`)

| Pacote                          | Licença    | Link                                              |
| ------------------------------- | ---------- | ------------------------------------------------- |
| react / react-dom               | MIT        | https://github.com/facebook/react                 |
| react-router-dom                | MIT        | https://github.com/remix-run/react-router         |
| @tanstack/react-query           | MIT        | https://github.com/TanStack/query                 |
| @radix-ui/react-\*              | MIT        | https://github.com/radix-ui/primitives            |
| recharts                        | MIT        | https://github.com/recharts/recharts              |
| lucide-react                    | ISC        | https://github.com/lucide-icons/lucide            |
| react-hook-form                 | MIT        | https://github.com/react-hook-form/react-hook-form|
| @hookform/resolvers             | MIT        | https://github.com/react-hook-form/resolvers      |
| zod                             | MIT        | https://github.com/colinhacks/zod                 |
| date-fns                        | MIT        | https://github.com/date-fns/date-fns              |
| sonner                          | MIT        | https://github.com/emilkowalski/sonner            |
| cmdk                            | MIT        | https://github.com/pacocoursey/cmdk               |
| vaul                            | MIT        | https://github.com/emilkowalski/vaul              |
| embla-carousel-react            | MIT        | https://github.com/davidjerleke/embla-carousel    |
| react-day-picker                | MIT        | https://github.com/gpbl/react-day-picker          |
| react-resizable-panels          | MIT        | https://github.com/bvaughn/react-resizable-panels |
| input-otp                       | MIT        | https://github.com/guilhermerodz/input-otp        |
| next-themes                     | MIT        | https://github.com/pacocoursey/next-themes        |
| class-variance-authority        | Apache-2.0 | https://github.com/joe-bell/cva                   |
| clsx                            | MIT        | https://github.com/lukeed/clsx                    |
| tailwind-merge                  | MIT        | https://github.com/dcastil/tailwind-merge         |
| tailwindcss-animate             | MIT        | https://github.com/jamiebuilds/tailwindcss-animate|
| zustand                         | MIT        | https://github.com/pmndrs/zustand                 |

## Ferramentas de dev / dev-server (`devDependencies` + mock local)

O `scripts/dev-server.ts` é um gateway mock **somente para desenvolvimento
local** (não vai para produção — em produção o backend é o `tenant-gateway`).
Usa:

| Pacote               | Licença | Link                                       |
| -------------------- | ------- | ------------------------------------------ |
| hono                 | MIT     | https://github.com/honojs/hono             |
| @hono/node-server    | MIT     | https://github.com/honojs/node-server      |
| pg (node-postgres)   | MIT     | https://github.com/brianc/node-postgres    |
| vite                 | MIT     | https://github.com/vitejs/vite             |
| tailwindcss          | MIT     | https://github.com/tailwindlabs/tailwindcss|
| typescript           | Apache-2.0 | https://github.com/microsoft/TypeScript |
| tsx                  | MIT     | https://github.com/privatenumber/tsx       |
| eslint               | MIT     | https://github.com/eslint/eslint           |

> As versões exatas estão fixadas em `package.json` / `package-lock.json`.
> Ao adicionar uma nova dependência, verifique a licença no repositório de
> origem (não confie no README) e registre-a aqui.
