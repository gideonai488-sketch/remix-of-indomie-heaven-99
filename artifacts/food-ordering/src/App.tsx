import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { lazy, Suspense, useEffect, Component, ReactNode } from "react";
import AppLoadingSkeleton from "@/components/AppLoadingSkeleton";
import { isNativePlatform } from "@/lib/platform";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";

class AppErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(err: Error) {
    console.error("[AppErrorBoundary]", err);
  }
  handleReload = async () => {
    // Clear any corrupt Supabase session before reloading
    await supabase.auth.signOut().catch(() => {});
    window.location.href = "/";
  };
  render() {
    if (!this.state.crashed) return this.props.children;
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", gap:16, padding:24, fontFamily:"sans-serif" }}>
        <img src="/owl-icon.png" alt="SpeedUp" style={{ width:64, height:64, borderRadius:16 }} />
        <p style={{ fontWeight:700, fontSize:18, margin:0 }}>Something went wrong</p>
        <p style={{ color:"#666", fontSize:14, margin:0, textAlign:"center" }}>
          The app ran into a problem. Tap below to reload.
        </p>
        <button onClick={this.handleReload}
          style={{ background:"#e63946", color:"#fff", border:"none", borderRadius:24, padding:"12px 32px", fontSize:15, fontWeight:700, cursor:"pointer" }}>
          Reload SpeedUp
        </button>
      </div>
    );
  }
}

const Index = lazy(() => import("./pages/Index"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const MenuPage = lazy(() => import("./pages/MenuPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const ServiceRequestPage = lazy(() => import("./pages/ServiceRequestPage"));
const TrackingPage = lazy(() => import("./pages/TrackingPage"));
const DemoTrackingPage = lazy(() => import("./pages/DemoTrackingPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));

const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminDashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const AdminOrdersPage = lazy(() => import("./pages/admin/OrdersPage"));
const MenuManagementPage = lazy(() => import("./pages/admin/MenuManagementPage"));
const BannersPage = lazy(() => import("./pages/admin/BannersPage"));
const CustomersPage = lazy(() => import("./pages/admin/CustomersPage"));

const queryClient = new QueryClient();

const SplashDismisser = () => {
  useEffect(() => {
    const splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("hide");
      setTimeout(() => splash.remove(), 500);
    }
  }, []);
  return null;
};

const PushRegistrar = () => {
  usePushNotifications();
  return null;
};

const showAdmin = !isNativePlatform();

const HomeRoute = () => {
  if (!localStorage.getItem("speedup_onboarded")) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Index />;
};

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <SplashDismisser />
            <PushRegistrar />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<AppLoadingSkeleton />}>
                <Routes>
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/" element={<HomeRoute />} />
                  <Route path="/menu" element={<MenuPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/service-request/:type" element={<ServiceRequestPage />} />
                  <Route path="/track/:id" element={<TrackingPage />} />
                  <Route path="/demo" element={<DemoTrackingPage />} />
                  {showAdmin && (
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<AdminDashboardPage />} />
                      <Route path="orders" element={<AdminOrdersPage />} />
                      <Route path="menu" element={<MenuManagementPage />} />
                      <Route path="banners" element={<BannersPage />} />
                      <Route path="customers" element={<CustomersPage />} />
                    </Route>
                  )}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
