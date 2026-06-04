// Minimal local types for `ical.js` (which has no @types package on npm).
// Mirrors the surface we use in src/ai/ics.ts.
declare module "ical.js" {
  export interface VEvent {
    startDate: { toJSDate(): Date };
    endDate?: { toJSDate(): Date } | null;
    summary: string;
    description?: string;
    location?: string;
    uid?: string;
  }
  export class Event {
    constructor(component: unknown);
    summary: string;
    description: string;
    location: string;
    startDate: { toJSDate(): Date };
    endDate: { toJSDate(): Date } | null;
  }
  export class Component {
    constructor(jcal: unknown);
    static fromString(input: string): Component;
    getAllSubcomponents(name: string): Component[];
    getFirstSubcomponent(name: string): Component | null;
    getFirstPropertyValue(name: string): string | undefined;
  }
  export function parse(input: string): unknown;
  const _default: {
    parse: typeof parse;
    Component: typeof Component;
    Event: typeof Event;
  };
  export default _default;
}
