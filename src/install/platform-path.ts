import path from "node:path";

export interface PlatformPath {
  readonly isAbsolute: (value: string) => boolean;
  readonly join: (...parts: string[]) => string;
  readonly resolve: (...parts: string[]) => string;
}

export const nativePlatformPath: PlatformPath = path;
export const posixPlatformPath: PlatformPath = path.posix;
export const win32PlatformPath: PlatformPath = path.win32;
