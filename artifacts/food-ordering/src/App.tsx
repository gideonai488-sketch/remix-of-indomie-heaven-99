import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { lazy, Suspense, useEffect } from "react";
import AppLoadingSkeleton from "@/components/AppLoadingSkeleton";
import { isNativePlatform } from "@/lib/platform";
import { usePushNotifications } from "@/hooks/usePushNotifications";

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

const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const OrdersPage = lazy(() => import("./pages/admin/OrdersPage"));
const MenuManagementPage = lazy(() => import("./pages/admin/MenuManagementPage"));
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

// Separate component so localStorage is checked on every render (not once at App mount)
const HomeRoute = () => {
  if (!localStorage.getItem("speedup_onboarded")) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Index />;
};

const App = () => (
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
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/service-request/:type" element={<ServiceRequestPage />} />
                <Route path="/track/:id" element={<TrackingPage />} />
                <Route path="/demo" element={<DemoTrackingPage />} />
                {showAdmin && (
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="menu" element={<MenuManagementPage />} />
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
);

export default App;
