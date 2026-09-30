# Home — Road to the Final

## Ownership

Introduce Road to the Final and the Women’s World Cup direction, then guide users into the product.

Product route: `/`. This is the target route mapping, not a claim that the
page is implemented. See the [feature map](../README.md).

## Phase 1 scope

- Brief product introduction and football branding.
- Overview of prediction and analytics capabilities.
- Navigation to Matches, Predictions, Teams, and Analytics.

## Data and current backend

Static content. A saved/recent prediction summary is optional and must not block Phase 1.

## Implementation notes

The existing components/home-view.tsx implements the Item/Action reference demo, not this landing page. Preserve its components, API modules, Server Actions, and tests until a deliberate route migration. A future landing view should have a separate entry component such as components/landing-view.tsx.

Keep React view composition in `components/`, feature types and transformations
in `domain/`, and endpoint functions in `api/` when those files are needed. Static
views can use a local content module; do not add empty API/domain layers.
The Next page should import the view component rather than own its implementation.

## Later scope

Featured fixtures, tournament status, and richer World Cup content.
