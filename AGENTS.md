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
