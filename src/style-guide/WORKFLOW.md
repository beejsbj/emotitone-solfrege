# Styleguide Porting Workflow

Branch: `implementing-design-system`

This branch is porting source preview HTML from `emotitone-design-system` into the app's local styleguide, then turning the useful pieces into reusable Vue components.

## Current Shape

- Bring preview HTML over as a loose styleguide specimen first, preserving the visual intent before over-abstracting it.
- Pick one primitive preview at a time and identify which parts are real component API versus specimen-only staging.
- Move the reusable surface into `src/components/primatives/` as a component the app can import outside the styleguide.
- Replace the styleguide-only markup with a specimen that imports and composes the real primitive.
- Use `AnatomyDisplay` to name the component parts and `VariantGrid` to show meaningful states, sizes, colors, or configurations.

## Working Rules

- The styleguide demonstrates components; it should not become the component source of truth.
- Keep specimen data small, explicit, and close to the preview being documented.
- Preserve the existing spelling/path convention: `primatives`.
- Do not polish unrelated UI while porting. If a cleanup appears, leave a note or make it a separate change.
- Treat source preview HTML as reference material, not production code. Extract intent, then compose with Vue.

## Done For One Primitive

- A reusable primitive exists under `src/components/primatives/`.
- The matching `src/style-guide/primatives/Primitive*.vue` imports that primitive instead of duplicating its structure.
- The specimen includes an anatomy view and a variant grid where they clarify real usage.
- The preview still visually tracks the source design-system reference.
