import { vignan } from "./vignanClient";

// Alias the local mock client as `base44` so pages importing
// from `@/api/base44Client` work without changes.
export const base44 = vignan;

export default base44;
