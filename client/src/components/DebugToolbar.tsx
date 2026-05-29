import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

const isDev = () => {
  if (import.meta.env.VITE_HIDE_DEV_TOOLBAR === "true") return false;
  if (import.meta.env.PROD) return false;
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isProd = hostname.includes("prod") || hostname.includes("production");
  return (hostname.includes("fly.dev") || hostname.includes("localhost")) && !isProd;
};

export function DebugToolbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [apiCalls, setApiCalls] = useState<any[]>([]);
  const { user } = useAuth();
  const [devMode, setDevMode] = useState(false);
  const [storageData, setStorageData] = useState<Record<string, string>>({});

  useEffect(() => {
    setDevMode(isDev());
  }, []);

  useEffect(() => {
    if (!devMode) return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const response = await originalFetch(...args);
      const duration = Date.now() - startTime;
      
      setApiCalls(prev => [...prev.slice(-19), {
        url: args[0]?.toString() || "unknown",
        status: response.status,
        duration,
        time: new Date().toISOString(),
      }]);
      
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [devMode]);

  useEffect(() => {
    if (!devMode) return;
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) data[key] = localStorage.getItem(key) || "";
    }
    setStorageData(data);
  }, [devMode, isOpen]);

  const clearApiCalls = () => setApiCalls([]);

  if (!devMode) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-50 h-10 w-10 p-0 bg-yellow-500 hover:bg-yellow-600 text-black border-2 border-black font-bold"
        >
          DEV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Debug Toolbar
            <Badge variant="destructive" className="bg-red-500">DEV MODE</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="api">API Calls ({apiCalls.length})</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
          </TabsList>
          
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Environment Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Environment</p>
                    <p className="font-mono font-bold text-yellow-600">development</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">App Version</p>
                    <p className="font-mono">1.0.0-dev</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Database</p>
                    <p className="font-mono text-green-600">Fly Postgres</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current User</p>
                    <p className="font-mono">{user?.username || "Chưa đăng nhập"}</p>
                    <p className="text-xs text-muted-foreground">{user?.role || "-"}</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">API Base URL</p>
                  <p className="font-mono text-sm bg-slate-100 p-2 rounded">
                    {typeof window !== "undefined" ? window.location.origin : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="api">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>API Calls</CardTitle>
                <Button variant="outline" size="sm" onClick={clearApiCalls}>
                  Clear
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {apiCalls.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No API calls captured</p>
                  ) : (
                    <div className="space-y-2">
                      {apiCalls.slice().reverse().map((call, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded"
                        >
                          <div className="flex-1 truncate font-mono">
                            {call.url.split("/").pop()}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={call.status < 400 ? "default" : "destructive"}>
                              {call.status}
                            </Badge>
                            <span className="text-muted-foreground">{call.duration}ms</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="storage">
            <Card>
              <CardHeader>
                <CardTitle>Local Storage</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {Object.entries(localStorage).map(([key, value]) => (
                      <div key={key} className="text-xs p-2 bg-slate-50 rounded">
                        <p className="font-mono font-bold">{key}</p>
                        <p className="text-muted-foreground truncate">{value}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}