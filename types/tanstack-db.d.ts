export {};

/**
 * Module augmentation for @tanstack/db.
 *
 * The IDE's TS server incorrectly resolves to the CJS declaration file
 * (dist/cjs/index.d.cts) which has broken internal references (.js instead
 * of .cjs), causing query operators to be unresolvable. tsc resolves the
 * ESM declarations correctly.
 *
 * This augmentation adds the missing function signatures so the IDE can
 * see them. tsc simply sees additional overloads that merge cleanly.
 */
declare module "@tanstack/db" {
  export function eq(left: any, right: any): any;
  export function or(left: any, right: any, ...rest: any[]): any;
  export function and(left: any, right: any, ...rest: any[]): any;
}
