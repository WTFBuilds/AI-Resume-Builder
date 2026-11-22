// NOTE: render.tsx (react-dom/server) is deliberately NOT re-exported here
// so server-component bundles never pull ReactDOMServer. Import it via
// the dedicated subpath: "@airesume/templates/render".
export * from "./schema";
export * from "./types";
export { TEMPLATES, TEMPLATE_LIST, getTemplate } from "./registry";
export { SAMPLE_DATA, SAMPLE_CONFIG } from "./sample";
