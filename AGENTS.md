# Smart Dispatch System — AI Agent & Engineering Reference Guide

This document is the authoritative reference for any AI agent or software engineer working on the **Smart Dispatch System** codebase across both **frontend (`apps/web`)** and **backend (`apps/api`)**.

---

## 1. System Overview & Monorepo Architecture

Smart Dispatch is an enterprise fleet management and dispatch platform tailored for Ethiopian corporate, business, and government transport operations.

### Monorepo Structure
- **Package Manager**: `pnpm` (v9+) with workspaces.
- **Build System**: `Turborepo` (`turbo`).
- **Directories**:
  - `apps/web`: Next.js 16 (App Router), React 19, Tailwind CSS v4, Base UI, Leaflet. Runs on port `3000`.
  - `apps/api`: Express 4, TypeScript, Prisma ORM 6, PostgreSQL 15, Socket.IO 4. Runs on port `4000`.
  - `packages/types`: Shared TypeScript interfaces, DTOs, enums, and Socket event definitions (`@smart-dispatch/types`).
  - `packages/database`: Shared database scripts and Prisma schema definitions.

### Development Proxy Flow
- Frontend runs on `http://localhost:3000`.
- Backend runs on `http://localhost:4000`.
- Next.js rewrites `/api/*` and `/uploads/*` to `http://localhost:4000`.
- Realtime WebSocket connects directly to `http://localhost:4000/api/ws`.

---

## 2. Ethiopian Regulatory, Financial & Locale Standards

### 1. Currency & Financial Precision
- **Base Currency**: All billing calculations operate in Ethiopian Birr (`ETB`).
- **VAT Rate**: Default VAT rate is 15% (configured via `app_settings`).
- **Precision**: Never perform floating-point arithmetic with uncontrolled precision. Store monetary amounts with 2-decimal precision.
- **Display**: Use localized currency formatters; never hardcode currency symbols like `$` or unformatted raw numbers.

### 2. Tax Identification (TIN) & eTrade Verification
- Corporate registrations require Tax Identification Numbers (TIN) and trade license validation via `etrade-registration.service.ts`.
- Business verification states (`pending`, `verified`, `rejected`) must be respected before activating corporate contract invoicing.

### 3. Date & Calendar Standards (Gregorian vs Ethiopian)
- **Database & Storage**: The database and API strictly store Gregorian standard ISO 8601 UTC timestamps (`toISOString()`). Never store Ethiopian calendar dates directly in PostgreSQL.
- **Amharic Display**: When displaying dates to Amharic users (`locale === "am"`), format using `formatEthiopianDate(date, "am")` from `@/lib/ethiopian-calendar`.
- **Form Pickers**: `AdminDatePicker` handles Gregorian dates internally while presenting localized calendar pickers to the operator.

---

## 3. Frontend Guidelines (`apps/web`)

### Tech Stack
- **Next.js 16** (App Router with `use client` where interaction/hooks are required).
- **React 19**.
- **Tailwind CSS v4** (uses modern utility conventions, container queries, CSS variables).
- **Base UI** (`@base-ui/react`) for accessible primitives (Select, Dialog, DropdownMenu).
- **Lucide React** for icons.

### Design System & Theme Tokens (`@/lib/admin-theme.ts`)
Always import and use tokens from `@/lib/admin-theme`:
- `adminTheme`: Brand color variables (`--brand-primary` #1C3A34, `--brand-accent` #C9B87A).
- `adminEyebrowClass`: `"text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]"`.
- `adminHeadingClass`: `"font-bold text-[var(--brand-primary)] dark:text-foreground"`.
- `adminCardClass`: `"border-slate-200/80 bg-white shadow-sm dark:border-border dark:bg-card"`.
- `adminIconBoxClass`: Rounded brand-tinted container for headers and cards.
- `adminInputClass`: Standard input styling with borders, shadows, and dark mode support.
- `adminSelectTriggerClass`: Full-width rounded select trigger.
- `adminPrimaryButtonClass`: Forest green brand primary button with hover darkening.

### Golden UI/UX Rules for AI Agents

1. **Semantic Typography for Page Eyebrows & Headings**:
   - **DO NOT** use artificial gold badge chips (`<Badge className={adminBadgeGoldClass}>...`) for page eyebrows or titles.
   - **DO** use clean semantic typography:
     ```tsx
     <p className={cn(adminEyebrowClass, "text-xs")}>{copy.eyebrow}</p>
     <h1 className={cn("text-2xl font-bold tracking-tight sm:text-[1.75rem]", adminHeadingClass)}>
       {copy.title}
     </h1>
     ```

2. **Base UI Dropdown `<Select>` Rule (Crucial)**:
   - When using `<Select>` from `@/components/ui/select`, **ALWAYS pass the `items` array to `<Select>`**:
     ```tsx
     <Select
       items={options} // Array of { label: string, value: string }
       value={currentValue}
       onValueChange={onChange}
     >
       <SelectTrigger className={adminSelectTriggerClass}>
         <SelectValue placeholder={placeholder} />
       </SelectTrigger>
       <SelectContent>
         <SelectGroup>
           {options.map((opt) => (
             <SelectItem key={opt.value} value={opt.value}>
               {opt.label}
             </SelectItem>
           ))}
         </SelectGroup>
       </SelectContent>
     </Select>
     ```
   - **Why**: Base UI requires `items` on the root `<Select>` component so that `<SelectValue />` correctly resolves the translated human-readable label rather than falling back to the raw enum key.

3. **Form Error Styling & Red Consistency**:
   - Always style error states consistently using:
     - `adminFieldErrorClass`: Reddish border (`border-red-300`), soft red tint (`bg-red-50/60`), and focus ring (`focus-visible:ring-red-200/60`).
     - `adminLabelErrorClass`: `"text-red-700 dark:text-red-400"`.
     - `adminErrorMessageClass`: `"text-xs font-medium text-red-600 dark:text-red-400"`.
   - Never use ad-hoc pink or purple shades for errors.

4. **Status Badges & Indicator Dots**:
   - Status badges in tables, queues, and detail sheets must use rounded-full pill styling with glowing indicator dots:
     - **Valid / Completed / Active**: Emerald dot (`bg-emerald-500`) + soft emerald badge.
     - **Pending / Due Soon / Warning**: Amber dot (`bg-amber-500`) + soft amber badge.
     - **Expired / Disrupted / Cancelled**: Pulsing red dot (`bg-red-500 animate-pulse`) + soft red badge.
     - **Draft / Not Set / Unassigned**: Neutral slate dot (`bg-slate-400`) + soft slate badge.
     - **In Progress / Dispatched**: Sky or violet dot (`bg-sky-500` / `bg-violet-500`) + matching badge.
   - **No Dot Colors on Stat Cards**: Keep overview KPI `StatCard` components clean and minimal with their domain Lucide icon. Never add colored dot indicators to `StatCard` titles; reserve indicator dots strictly for table status pills, lists, and queue boards.

5. **Table UX & Toolbar Actions**:
   - **License Plates**: Render vehicle plates in a monospace badge button with a `Car` icon that links directly to the vehicle console.
   - **Direct Row Actions**: Prefer direct 1-click icon buttons (`View` with `Eye`, `Edit` with `Pencil`) over burying 1-2 actions inside a 3-dot dropdown menu.
   - **Filter Reset Button**: Always provide a dynamic `RotateCcw` reset button next to dropdown filters whenever an active filter is applied.

6. **Responsive Card Labels & Typography**:
   - Avoid long rigid text in small grid cards that truncates with `...`.
   - Use adaptive responsive labels (e.g. concise label on compact cards, full descriptive label on wide cards, backed by a `title` browser tooltip).

7. **Standardized `DataTable` Pattern**:
   - Server-paginated tables must define `DataTableFetchParams` (`page`, `limit`, `search`).
   - Pass `refreshDeps` to trigger reload smoothly without full component re-renders.
   - Always specify localized empty states (`emptyTitle`, `emptyDescription`, `emptySearchDescription`).

8. **Toasts & Feedback**:
   - Always use `showSuccessToast` and `showErrorToast` from `@/lib/toast` with translated copy.
   - When submitting forms or sheets, buttons must display `<Loader2 className="animate-spin size-4" />` with a disabled state during network calls.

9. **In-Flight Cancellation**:
   - Always use `let cancelled = false` with cleanup inside `useEffect` to prevent stale state updates during rapid navigation, search typing, or locale toggling.

10. **100% Bilingual Localization (English & Amharic)**:
    - Never hardcode user-facing strings.
    - Always fetch messages from `@/translations` using the current locale (`const { locale } = useLocale()`).

11. **Strict File Size & Lines of Code (LOC) Limits (Max 300–350 LOC)**:
    - **Hard Limit**: No single UI component or page file should exceed **300–350 lines of code**.
    - **Proactive Decomposition**: When a file approaches ~250 lines, decompose it into focused, cohesive modules under a co-located `_components/` directory:
      - `[domain]-stats.tsx`: KPI metrics and overview cards.
      - `[domain]-table.tsx` or `board.tsx`: Table or board presentation.
      - `[domain]-form.tsx` or `sheet.tsx`: Creation/edit forms and sheets.
      - `[domain]-types.tsx`: Domain-specific view models, status tone configs, and column helpers.
    - **Single Responsibility**: Never bundle modals, forms, heavy tables, and stats cards inside a single file. Keep top-level pages as lightweight coordinators (< 250 LOC).

---

## 4. Backend Guidelines (`apps/api`)

### Tech Stack
- **Node.js + Express 4**.
- **Prisma ORM 6** with PostgreSQL 15.
- **Socket.IO 4** for real-time dispatch and driver location streaming.
- **JWT + Bcrypt** for secure role-based session authentication.
- **Scalar / OpenAPI** for interactive API documentation (`/api/docs`).

### Architectural Layers
1. **Routes (`src/routes/`)**:
   - Mount URL paths and apply middleware (`authenticateJWT`, `requirePermission`, `auditMutation`).
   - Parse and validate request bodies and query parameters.
   - Delegate business logic to dedicated services.
2. **Services (`src/services/`)**:
   - Encapsulate all database transactions, calculations, and domain workflows.
   - Examples:
     - `fare-calculation.service.ts`: Pricing rules, distance/time rates, and minimum floors.
     - `dispatch-allocation.service.ts`: Driver assignment and match optimization.
     - `dispatch-escalation.service.ts`: SLA breach detection and dispatcher warnings.
     - `trip-disruption.service.ts`: Breakdown handling and emergency rerouting.
     - `invoice-generation.service.ts` & `invoice-automation.service.ts`: Billing statements.
3. **Mandatory Audit Logging (`audit-log.service.ts`)**:
   - All mutating operations (POST, PUT, PATCH, DELETE) must record an audit entry with:
     - `actor_id` (from `req.user.id`).
     - `action` (e.g. `VEHICLE_UPDATED`, `FARE_PLAN_CREATED`, `DISPATCH_OVERRIDDEN`).
     - `entity_type` & `entity_id`.
     - `diff` or metadata payload.
4. **Background Scheduler (`scheduler.service.ts`)**:
   - Runs in the API process for periodic background tasks:
     - Automated contract invoicing cycles.
     - Scheduled ride-request reminders (SMS, Email, Push).
     - Compliance expiration scans (flagging vehicles nearing inspection/insurance expiry).
     - SLA escalation monitors for unassigned requests.

### Database & Prisma Best Practices
- **Schema Location**: `apps/api/prisma/schema.prisma`.
- **Generate Client**: `pnpm --filter api db:generate`.
- **Create Migration**: `pnpm --filter api db:migrate` (never manually edit migration SQL files unless resolving data backfills).
- **Client Access**: Always import Prisma client from the single shared instance in `src/db/prisma.ts` or `src/lib/prisma.ts`.
- **Batching & Efficiency**: Never query the database inside a `for` loop. Use `findMany({ where: { id: { in: ids } } })` or relations with `include`.

### Controller & Response Conventions
1. **Response Envelope**: Always return consistent JSON envelopes:
   ```json
   {
     "success": true,
     "data": { ... }
   }
   ```
   Or on error:
   ```json
   {
     "success": false,
     "error": "Short machine-readable code or message",
     "message": "Human readable explanation"
   }
   ```
2. **HTTP Status Codes**:
   - `200 OK`: Successful read or update.
   - `201 Created`: Successful creation.
   - `400 Bad Request`: Validation failure or malformed payload.
   - `401 Unauthorized`: Missing or invalid JWT.
   - `403 Forbidden`: Authenticated user lacks required permission.
   - `404 Not Found`: Resource does not exist.
   - `409 Conflict`: Unique constraint violation or state transition conflict.
   - `500 Internal Server Error`: Unhandled server exception (logged with stack trace; do not leak internals to client).

3. **Authentication & RBAC Middleware**:
   - Protect sensitive routes using `authenticateJWT` and `requirePermission(PERMISSIONS.xxx)`.
   - Never trust client-supplied actor IDs (e.g., `userId` from body); extract identity from `req.user.id`.

### Real-time WebSocket Protocol (`/api/ws`)
- **Connection Handshake**: Handshake requires a valid JWT token.
- **Room Strategy**:
  - `dispatch_room`: Broadcasts to all active dispatch operators.
  - `vehicle_${vehicleId}`: Live GPS telemetry and vehicle status updates.
  - `trip_${requestId}`: Trip-specific room for passenger and assigned driver.
- **Event Contracts**: Event names and payload interfaces must always be imported from `@smart-dispatch/types`.

---

## 5. Shared Package (`packages/types`)

The `packages/types` workspace package is the single source of truth for all data models shared between `apps/web` and `apps/api`:
- **Domain Entities**: `Vehicle`, `RideRequest`, `Invoice`, `Complaint`, `FarePlan`, etc.
- **Enums**: `VehicleComplianceStatus`, `RideRequestStatus`, `InvoiceStatus`, `PriorityLevel`.
- **Payload DTOs**: Create and update request bodies.
- **Realtime Payloads**: Socket event maps and telemetry packets.

**Rule**: Whenever adding or modifying a data model or status enum, **always update `packages/types` first**, then consume the updated type in `apps/api` and `apps/web`.

---

## 6. Universal Software Craftsmanship & Engineering Principles

### 1. SOLID, DRY & KISS in Practice
- **Single Responsibility (SRP)**: Each component, route handler, and service function must have one clear reason to change. Services handle business logic and database queries; routes handle HTTP mapping and auth middleware; components handle display and interaction.
- **Do Not Repeat Yourself (DRY)**: Centralize repetitive domain algorithms (e.g., fare calculations, date transformations, status pill tones, payload conversions) into dedicated shared modules (`@/lib/*` or `@smart-dispatch/types`).
- **Keep It Simple (KISS & YAGNI)**: Avoid premature abstractions, speculative generic wrappers, and over-engineered inheritance trees. Write direct, readable, and self-documenting code.

### 2. Strict Type Safety & TypeScript Discipline
- **Zero `any` Policy**: Never use `any` as an escape hatch. Use typed interfaces, generics, or `unknown` with runtime type narrowing.
- **Shared Contracts First**: All entities exchanged between backend and frontend must originate from `@smart-dispatch/types`. Never create conflicting local interfaces for API resources.
- **Explicit Function Signatures**: Exported utility functions, service methods, and API helpers must declare explicit parameter and return types.

### 3. Defensive Programming & State Immutability
- **Null & Undefined Safety**: Always use optional chaining (`?.`), nullish coalescing (`??`), and sensible fallbacks rather than assuming relational data or API payloads are fully populated.
- **Immutable State Updates**: Never mutate React state or function arguments directly. Use functional state setters (`setForm((prev) => ({ ...prev, [key]: val }))`).
- **Cleanup & Memory Leak Prevention**: Always cancel subscriptions, abort in-flight requests, and clear intervals or timeouts in `useEffect` cleanup handlers.
- **Graceful Error Degradation**: Wrap network and database operations in `try / catch / finally` blocks. Ensure loading states are reset and user-friendly localized error messages are displayed.

### 4. Strict File Size & Lines of Code (LOC) Limits
- **Hard Ceiling**: No single source code file (`.ts`, `.tsx`) should exceed **300–350 lines of code**.
- **Proactive Decomposition Rule**: Whenever a file approaches 250–300 LOC, refactor and decompose it immediately before adding new logic:
  - **Frontend Views**: Break views into cohesive modules inside `_components/` (e.g. `header.tsx`, `stats.tsx`, `board.tsx`, `dialog.tsx`, `types.tsx`). Top-level page files should remain lightweight coordinators (< 250 LOC).
  - **Backend Services**: Avoid 800+ line monoliths. Break services into focused domain services (e.g. separate `fare-calculation.service.ts`, `booking-policy-enforcement.service.ts`, `invoice-penalty.service.ts`).
  - **Controllers & Routes**: Keep route handlers minimal (parsing, middleware invocation, response mapping) and delegate all execution to dedicated services.
- **No Hybrid Junk Drawers**: Never dump types, mock payloads, UI subcomponents, and API callers in the same file. Separate types into `types.ts` or `@smart-dispatch/types`.

---

## 7. UI/UX Design Excellence & Visual Consistency System

### 1. Visual Hierarchy & Palette Discipline
- **Tailored Brand Palette**:
  - Forest Green primary (`#1C3A34`) for authority, primary navigation, and high-priority action buttons.
  - Warm Gold accent (`#C9B87A`) for elegant eyebrows, active indicators, and focus highlights.
  - Curated semantic tones: emerald for success/active, amber for warning/due-soon, red for danger/expired, sky/violet for in-progress, and slate for neutral/draft.
  - Never use raw default colors (e.g. avoid plain `#ff0000` or `#00ff00`).
- **Spacing & Geometric Rhythm**: Maintain consistent 4px/8px/12px/16px/24px/32px spacing scales (`p-4`, `p-5`, `gap-3`, `gap-4`, `space-y-5`).

### 2. Complete State Coverage & Interaction States
Every interactive element must provide distinct visual feedback for all interaction states:
- **Hover**: Subtle background tint (`hover:bg-slate-50`, `hover:bg-[#1C3A34]/8`) and border transition.
- **Active / Pressed**: Subtle scale or shade darkening for tactile feedback.
- **Focus-Visible**: High-visibility focus ring (`focus-visible:ring-2 focus-visible:ring-[#1C3A34]/20`) for keyboard navigation.
- **Disabled**: Reduced opacity (`disabled:opacity-50`) and disabled cursor (`disabled:pointer-events-none`).
- **Loading**:
  - Buttons undergoing async operations must display `<Loader2 className="animate-spin size-4" />` and enter disabled state.
  - Views awaiting data must render geometric `<Skeleton>` placeholders that mirror the exact target layout to prevent Cumulative Layout Shift (CLS).
- **Empty States**: Every table, board, and queue must render an engaging empty state featuring a domain Lucide icon, localized title, reassuring description, and a clear call-to-action button.

### 3. Accessibility (a11y) & Keyboard Navigation
- **Semantic HTML**: Use proper semantic landmarks (`<main>`, `<header>`, `<section>`, `<nav>`, `<button>`, `<table>`) rather than arbitrary `<div>` nesting.
- **Screen Reader Readiness**: Every icon-only button must declare an explicit `aria-label` or `title` tooltip.
- **Keyboard Operability**: All dropdowns, dialogs, drawers, and actions must be fully operable using standard keyboard keys (Tab, Shift+Tab, Enter, Space, Escape).

### 4. Responsive & Mobile-First Fluidity
- **Adaptive Layouts**: Interfaces must remain fluid from 360px mobile screens to ultra-wide 4K monitors without horizontal scrolling.
- **Preventing Ellipsis Clutter**: Avoid long rigid text in small grid cards that truncates into unreadable `...`. Provide adaptive labels (e.g. concise on compact cards, full on wide cards, backed by `title` tooltips).
- **Touch Targets**: Interactive controls must maintain a minimum touch target size of 40x40px on touch-enabled devices.

---

## 8. Common Anti-Patterns for AI Agents to Avoid

1. **No Monolithic Files (> 350 LOC)**: Never create or allow single files to balloon past 300–350 lines. Decompose early into clean submodules.
2. **No Artificial Badge Clutter**: Never use badge chips (`adminBadgeGoldClass`) for page titles or subtitles.
3. **No Raw Hardcoded Strings**: Never hardcode English copy in components; always retrieve from `@/translations`.
4. **No Raw DB Operations in Route Files**: Keep database queries in service files, keeping routes focused on HTTP mapping and validation.
5. **No Direct DB Calls in Loops**: Avoid `await Promise.all(items.map(async () => prisma.xxx.findFirst()))`. Use bulk queries with `in: [...]`.
6. **No Client-Supplied User IDs**: Never use `req.body.userId` for authorizations; trust only `req.user`.
7. **No Native `alert()` or `console.error` for UX**: Always use `showErrorToast` and standard error banners.
8. **No Hardcoded Dates**: Always format dates using the locale-aware helpers (`formatComplianceDate`, `formatEthiopianDate`).

---

## 9. Verification & Quality Assurance Protocols

Before concluding any work, every AI agent must run and pass the following verification checks:

1. **Frontend Type Check**:
   ```bash
   pnpm --filter web exec tsc --noEmit
   ```
   *Must exit with 0 errors.*

2. **Backend Type Check**:
   ```bash
   pnpm --filter api exec tsc --noEmit
   ```
   *Must exit with 0 errors.*

3. **Monorepo Build Verification** (when modifying shared packages or configs):
   ```bash
   pnpm build
   ```

4. **Linting Check**:
   ```bash
   pnpm lint
   ```

5. **File LOC Ceiling Check**: Ensure no created or modified file exceeds the **300–350 lines of code (LOC)** threshold.

6. **No Placeholders**: Never commit empty stub components, fake `TODO` placeholders in production logic, or unstyled mock UI.
