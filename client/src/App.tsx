import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Layout } from "@/components/Layout";
import Home from "@/pages/Home";
import Menu from "@/pages/Menu";
import Orders from "@/pages/Orders";
import Kitchen from "@/pages/Kitchen";
import Reports from "@/pages/Reports";
import History from "@/pages/History";
import Tables from "@/pages/Tables";
import MenuTv from "@/pages/MenuTv";

function Router() {
  return (
    <Switch>
      <Route path="/menu-tv" component={MenuTv} />
      <Route path="/" />
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
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
