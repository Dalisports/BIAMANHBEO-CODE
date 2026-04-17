import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone } from "lucide-react";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Also check after a delay in case the event already fired
    const timer = setTimeout(() => {
      if (!deferredPrompt && !isStandalone) {
        setShowInstallButton(true);
      }
    }, 3000);

    return function cleanup() {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    const prompt = deferredPrompt as any;
    prompt.prompt();

    const { outcome } = await prompt.userChoice;
    
    if (outcome === "accepted") {
      setShowInstallButton(false);
    }
    
    setDeferredPrompt(null);
  };

  if (isInstalled) return null;

  return (
    <>
      {/* Native install prompt */}
      {deferredPrompt && showInstallButton && (
        <Button
          onClick={handleInstall}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-50 animate-bounce"
        >
          <Download className="w-5 h-5" />
          <span className="font-bold">Cài đặt App</span>
        </Button>
      )}
      
      {/* Fallback hint for devices that don't show prompt */}
      {!deferredPrompt && showInstallButton && (
        <div className="fixed bottom-4 left-4 right-4 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 z-50 text-sm">
          <Smartphone className="w-4 h-4" />
          <span>Để cài app: Menu trình duyệt → <strong>Cài đặt App</strong> hoặc <strong>Thêm vào màn hình chính</strong></span>
        </div>
      )}
    </>
  );
}