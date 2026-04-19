import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, X, Keyboard } from "lucide-react";

interface QrScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title: string;
  description?: string;
}

const SCANNER_ELEMENT_ID = "qr-scanner-region";

export function QrScanner({ open, onClose, onScan, title, description }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open || manualMode) return;

    let cancelled = false;
    setError(null);
    setStarting(true);

    const startScanner = async () => {
      try {
        await new Promise((r) => setTimeout(r, 100));
        if (cancelled) return;

        const el = document.getElementById(SCANNER_ELEMENT_ID);
        if (!el) {
          setError("Không tìm thấy vùng quét");
          setStarting(false);
          return;
        }

        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (vw: number, vh: number) => {
              const size = Math.floor(Math.min(vw, vh) * 0.7);
              return { width: size, height: size };
            },
            aspectRatio: 1.0,
          },
          (decoded) => {
            if (cancelled) return;
            cancelled = true;
            scanner.stop().catch(() => {}).finally(() => {
              scanner.clear();
              scannerRef.current = null;
              onScan(decoded);
            });
          },
          () => {}
        );
        setStarting(false);
      } catch (err: any) {
        console.error("QR scanner error:", err);
        setError(err?.message || "Không truy cập được camera. Hãy cấp quyền hoặc nhập mã thủ công.");
        setStarting(false);
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        s.stop().catch(() => {}).finally(() => {
          try { s.clear(); } catch {}
        });
        scannerRef.current = null;
      }
    };
  }, [open, manualMode, onScan]);

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (!code) return;
    onScan(code);
    setManualCode("");
    setManualMode(false);
  };

  const handleClose = () => {
    setManualMode(false);
    setManualCode("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {title}
          </DialogTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </DialogHeader>

        {!manualMode ? (
          <div className="px-4 pb-4 space-y-3">
            <div className="relative bg-black rounded-xl overflow-hidden aspect-square">
              <div id={SCANNER_ELEMENT_ID} className="w-full h-full" />
              {starting && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                  Đang khởi động camera...
                </div>
              )}
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setManualMode(true)} className="flex-1">
                <Keyboard className="w-4 h-4 mr-2" />
                Nhập mã thủ công
              </Button>
              <Button variant="ghost" onClick={handleClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-4 pb-4 space-y-3">
            <Input
              autoFocus
              placeholder="Nhập mã QR..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") handleManualSubmit(); }}
              className="font-mono"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setManualMode(false)} className="flex-1">
                <Camera className="w-4 h-4 mr-2" />
                Dùng camera
              </Button>
              <Button onClick={handleManualSubmit} disabled={!manualCode.trim()} className="flex-1">
                Xác nhận
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
