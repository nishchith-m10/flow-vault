declare module 'vitest' {
  export const vi: any;
  export function describe(name: string, fn: Function): void;
  export function it(name: string, fn: Function): void;
  export function beforeAll(fn: Function): void;
  export function afterAll(fn: Function): void;
  export function expect(val: any): any;
}
