// Stylist accessors. Backed by the catalog cache (Firestore, or bundled seed
// data when Firebase is unconfigured). Callers must ensure loadCatalog() has
// resolved — the app gates the session on that.
export { getStylistById, getStylists, getStylistsForService } from './catalog';
