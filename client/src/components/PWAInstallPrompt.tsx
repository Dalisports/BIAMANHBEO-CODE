import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, X } from "lucide-react";

const PWA_HINT_DISMISSED_KEY = "pwa-install-hint-dismissed";

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
      const dismissed = localStorage.getItem(PWA_HINT_DISMISSED_KEY) === "1";
      if (!deferredPrompt && !isStandalone && !dismissed) {
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
          className="fixed bottom-24 md:bottom-4 left-1/2 -translate-x-1/2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-40 animate-bounce"
        >
          <Download className="w-5 h-5" />
          <span className="font-bold">Cài đặt App</span>
        </Button>
      )}
      {/* Fallback hint is hidden for now */}
    </>
  );
}