// Matchers do jest-dom só quando houver DOM (ambiente jsdom); no ambiente node não faz nada.
if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
}
export {};
