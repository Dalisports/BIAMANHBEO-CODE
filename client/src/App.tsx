import { Switch, Route, Redirect } from "wouter";
import { useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import Home from "@/pages/Home";
import Menu from "@/pages/Menu";
import Orders from "@/pages/Orders";
import Kitchen from "@/pages/Kitchen";
import Reports from "@/pages/Reports";
import History from "@/pages/History";
import Tables from "@/pages/Tables";
import MenuTv from "@/pages/MenuTv";
import MenuTvSimple from "@/pages/MenuTvSimple";
import Login from "@/pages/Login";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import Attendance from "@/pages/Attendance";
import Users from "@/pages/Users";
import { DebugToolbar } from "@/components/DebugToolbar";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ component: Component, requireOwner = false }: { component: any; requireOwner?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (requireOwner && user.role !== "owner") {
    return <Redirect href="/" />;
  }

  return <Component />;
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/menu-tv" component={MenuTv} />
      <Route path="/menutv" component={MenuTvSimple} />
      <Route path="/login" component={Login} />
      <Route path="/app" component={Login} />

      {/* Protected routes wrapped in Layout */}
      {!user ? (
        <Route path="*">
          <Redirect href="/login" />
        </Route>
      ) : (
        <Layout>
          <Switch>
            <Route path="/"><ProtectedRoute component={Tables} /></Route>
            <Route path="/orders"><ProtectedRoute component={Orders} /></Route>
            <Route path="/kitchen"><ProtectedRoute component={Kitchen} /></Route>
            <Route path="/menu"><ProtectedRoute component={Menu} /></Route>
            <Route path="/reports"><ProtectedRoute component={Reports} requireOwner /></Route>
            <Route path="/history"><ProtectedRoute component={History} /></Route>
            <Route path="/tables"><ProtectedRoute component={Tables} /></Route>
            <Route path="/home"><ProtectedRoute component={Home} /></Route>
            <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
            <Route path="/profile"><ProtectedRoute component={Profile} /></Route>
            <Route path="/attendance"><ProtectedRoute component={Attendance} /></Route>
            <Route path="/users"><ProtectedRoute component={Users} requireOwner /></Route>
            <Route component={NotFound} />
          </Switch>
        </Layout>
      )}

      {/* Fallback for cases not caught above */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();

  return (
    <>
      <Router />
      <DebugToolbar />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <PWAInstallPrompt />
        <PWAUpdatePrompt />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;