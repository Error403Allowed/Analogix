declare module 'next' {
  export type Metadata = any;
  export type Viewport = any;
  export type NextConfig = any;
  export namespace MetadataRoute {
    export type Robots = any;
  }
  const next: any;
  export default next;
}

declare module 'next/server' {
  export type NextResponse<T = any> = any;
  export const NextResponse: any;
  export type NextRequest = any;
  export const NextRequest: any;
  export const cookies: any;
  export const headers: any;
  const _default: any;
  export default _default;
}

declare module 'next/navigation' {
  export function useRouter(...args: any[]): any;
  export function usePathname(...args: any[]): any;
  export function useParams(...args: any[]): any;
  export function useSearchParams(...args: any[]): any;
  export function redirect(...args: any[]): any;
  const _default: any;
  export default _default;
}

declare module 'next/headers' {
  export function cookies(...args: any[]): any;
  export function headers(...args: any[]): any;
}

declare module 'next/link' {
  import React from 'react';
  const Link: any;
  export type LinkProps = any;
  export default Link;
  export { Link };
}
