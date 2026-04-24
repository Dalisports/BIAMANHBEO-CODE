import { Switch, Route, Redirect } from "wouter";
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
import GauAssistant from "@/pages/GauAssistant";
import { FloatingChatBubble } from "@/components/FloatingChatBubble";
import Menu from "@/pages/Menu";
import Orders from "@/pages/Orders";
import Kitchen from "@/pages/Kitchen";
import Reports from "@/pages/Reports";
import History from "@/pages/History";
import Tables from "@/pages/Tables";
import MenuTv from "@/pages/MenuTv";
import Login from "@/pages/Login";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import Attendance from "@/pages/Attendance";

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
  
  return (
    <Switch>
      <Route path="/menu-tv" component={MenuTv} />
      <Route path="/login" component={Login} />
      {!user && !isLoading && (
        <Route path="*">
          <Redirect href="/login" />
        </Route>
      )}
      <Layout>
        <Switch>
          <Route path="/" component={Tables} />
          <Route path="/orders" component={Orders} />
          <Route path="/kitchen" component={Kitchen} />
          <Route path="/menu" component={Menu} />
          <Route path="/reports" component={Reports} />
          <Route path="/history" component={History} />
          <Route path="/tables" component={Tables} />
          <Route path="/home" component={Home} />
          <Route path="/gau-assistant" component={GauAssistant} />
          <Route path="/settings" component={Settings} />
          <Route path="/profile" component={Profile} />
          <Route path="/attendance" component={Attendance} />
        </Switch>
      </Layout>
      <Route component={NotFound} />
    </Switch>
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
          <Router />
        <FloatingChatBubble />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;