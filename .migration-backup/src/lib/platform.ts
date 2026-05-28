import { Capacitor } from "@capacitor/core";

/**
 * Returns true when running inside a native Capacitor shell
 * (iOS / Android). Admin routes are excluded from native builds.
 */
export const isNativePlatform = () => Capacitor.isNativePlatform();
