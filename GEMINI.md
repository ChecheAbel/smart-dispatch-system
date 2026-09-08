# Gemini & AI Assistant Guidelines

Please refer to the comprehensive [AGENTS.md](./AGENTS.md) file in the root directory for all architectural rules, frontend UI/UX standards, backend conventions, Prisma rules, design system tokens, and verification protocols.

### Key Rules Summary:
1. **Frontend (`apps/web`)**:
   - Use design system tokens from `@/lib/admin-theme.ts`.
   - Use semantic typography for eyebrows (`<p className={cn(adminEyebrowClass, "text-xs")}>{copy.eyebrow}</p>`), not artificial gold badge chips.
   - Base UI `<Select>`: Always pass `items={options}` array to `<Select>` so `<SelectValue />` resolves localized display labels.
   - Form errors: Consistent reddish styling using `adminFieldErrorClass` and `adminErrorMessageClass`.
   - Status badges: Rounded-full pills with glowing colored indicator dots (emerald, amber, red pulse, slate).
   - 100% bilingual localization (`en` and `am`) via `@/translations`.
   - Strict LOC Limits: Never exceed **300–350 lines of code** per file; proactively decompose views into `_components/` and services into domain helpers.
2. **Backend (`apps/api`)**:
   - Express 4 + TypeScript + Prisma ORM + PostgreSQL + Socket.IO.
   - Standard JSON envelope (`{ success: boolean, data?: ..., error?: ... }`).
   - Run migrations with `pnpm --filter api db:migrate` and generate with `pnpm --filter api db:generate`.
   - RBAC & JWT authentication on all sensitive endpoints.
3. **Shared Contracts (`packages/types`)**:
   - Single source of truth for DTOs, Enums, and Models. Update here first.
4. **Verification**:
   - Always run `pnpm --filter web exec tsc --noEmit` and `pnpm --filter api exec tsc --noEmit` before completing any task.
