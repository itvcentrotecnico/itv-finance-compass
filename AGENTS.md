<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Finance modules are declared in `src/lib/modules.ts` and rendered by the `/$modulo` route; add new modules to the registry, not new ad-hoc routes. Why: navigation and pages stay in sync as the platform grows.
- Role/permission matrix lives in `src/lib/auth/permissions.ts`; it must be mirrored in backend RLS once auth is enabled — UI checks alone are never authoritative.
- Financial pages live under `src/routes/_authenticated/` (client-only gate that loads the user's active role from `financeiro_hml.perfis`); auth pages stay public. Why: no financial UI renders without a verified session and active profile.
- App data lives in the `financeiro_hml` schema, accessed via `.schema('financeiro_hml')` (not in generated types); privileged auth admin calls (invites) run only in `src/lib/usuarios.functions.ts` after verifying `tem_papel` as the caller. Why: RLS stays the authority and service_role never reaches the browser.
- Financial registries write via the browser client under RLS (`src/lib/cadastros.ts`); audit trail (`financeiro_hml.auditoria`) and authorship are filled only by DB triggers and never written by the app. Why: the database stays the single authority for permissions and history.
- Treasury writes use authenticated TanStack server functions calling role-validated transactional SQL RPCs; immutable operation/effect records and database aggregates are the only balance authority. Why: atomicity, idempotency and exact decimal money must hold even for direct API callers.
- Treasury monetary values cross JavaScript boundaries as decimal strings and use bigint cents only for formatting/validation; never Number arithmetic. Why: large values and cents must remain exact.
- Treasury correction and reversal scripts acquire fail-fast exclusive table locks before empty-state checks in the same READ COMMITTED transaction, after draining RPCs in maintenance; local concurrency tests use an isolated database and authenticated roles. Why: prevent preflight write races without silently waiting on old function executions or touching HML.
