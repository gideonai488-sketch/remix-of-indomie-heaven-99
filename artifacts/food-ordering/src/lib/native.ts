export const initNativeApp = async () => {
  // Only run on native platforms
  if (typeof window === 'undefined') return;
  
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
    const { SplashScreen } = await import('@capacitor/splash-screen');

    await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    await StatusBar.setBackgroundColor({ color: '#1A1410' }).catch(() => {});
    
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    }

    await Keyboard.setResizeMode({ mode: KeyboardResize.Body }).catch(() => {});
    await SplashScreen.hide().catch(() => {});
  } catch {
    // Not running in native context
  }
};

export const isNative = async () => {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};
