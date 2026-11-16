# Home

`src/app/page.tsx` directly renders Esteban's unchanged `components/home-view.tsx`.
Home presents the Women's World Cup hero, feature cards, scenario calls to action
and existing shared navigation. It needs no backend configuration, UUID parsing,
legacy props, form submission or API calls.

`components/landing-view.tsx` is preserved inactive reference UI and tested directly.
Restored `api/`, `domain/`, ItemForm, ActionForm and `src/lib/env/server.ts` remain
historical Item/Action references. Their isolated mocked tests verify reference
behavior, not compatibility with the five-domain Flask backend. Do not activate
those clients or require SERVICE_API_BASE_URL for normal operation.

`/about`, `/blog` and `/project` are preserved informational destinations awaiting
implementation. Do not change Esteban's navigation or invent pages to satisfy tests.
The legacy Home runner is retired; Demo is a static reference. Active football views
use the existing `/api/football` proxy and fifteen normalized operations. See the
[feature map](../README.md) and [testing](../../../docs/TESTING.md).
