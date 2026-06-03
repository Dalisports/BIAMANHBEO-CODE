import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, getAuthHeaders } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, DollarSign, History, Play, Square, Timer, ScanLine } from "lucide-react";
import { QrScanner } from "@/components/QrScanner";

interface AttendanceRecord {
  id: number;
  userId: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  totalHours: number | null;
  status: string;
}

type ScanMode = "checkin" | "checkout" | null;

export default function Attendance() {
  const { isOwner } = useAuth();
  const { toast } = useToast();

  const queryClient = useQueryClient();
  const [scanMode, setScanMode] = useState<ScanMode>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());

  const { data: records = [] } = useQuery({
    queryKey: ["/api/attendance/my"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/my", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json() as Promise<AttendanceRecord[]>;
    },
    enabled: !isOwner,
  });

  const { data: hourlyRateData } = useQuery({
    queryKey: ["/api/attendance/rate"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/rate", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch hourly rate");
      return res.json();
    },
    enabled: !isOwner,
  });

  const hourlyRate = hourlyRateData?.hourlyRate || 50000;

  const todayStatus = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return records.find((r) => r.date === today) || null;
  }, [records]);

  const isCheckedIn = todayStatus?.status === "checked_in";
  const isCheckedOut = todayStatus?.status === "checked_out";

  useEffect(() => {
    if (isCheckedIn) {
      const interval = setInterval(() => setNow(new Date()), 30000);
      return () => clearInterval(interval);
    }
  }, [isCheckedIn]);

  const handleScan = async (code: string) => {
    const mode = scanMode;
    setScanMode(null);
    if (!mode) return;
    const url = mode === "checkin" ? "/api/attendance/checkin" : "/api/attendance/checkout";
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ qrCode: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && data.id) {
        toast({
          title: mode === "checkin" ? "Check-in thành công" : "Check-out thành công",
          description: mode === "checkin" ? "Bạn đã bắt đầu ca làm việc" : "Bạn đã kết thúc ca làm việc",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/attendance/my"] });
      } else {
        toast({
          title: mode === "checkin" ? "Check-in thất bại" : "Check-out thất bại",
          description: data?.message || (mode === "checkin" ? "Mã không hợp lệ hoặc đã check-in hôm nay" : "Chưa check-in hoặc mã không hợp lệ"),
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({ title: "Lỗi", description: "Không kết nối được máy chủ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const calculateCurrentHours = () => {
    if (!todayStatus?.checkIn) return 0;
    const checkInTime = new Date(todayStatus.checkIn).getTime();
    const diffMs = now.getTime() - checkInTime;
    return diffMs / (1000 * 60 * 60);
  };

  const getHoursFromDb = (hours: number | null) => (hours ? hours / 100 : 0);

  const currentHours = isCheckedIn ? calculateCurrentHours() : 0;
  const totalHistoricalHours = records.reduce((sum, r) => sum + getHoursFromDb(r.totalHours), 0);
  const totalHours = totalHistoricalHours + currentHours;
  const estimatedEarnings = totalHours * hourlyRate;

  const formatHours = (h: number) => {
    const totalMin = Math.max(0, Math.round(h * 60));
    const hh = Math.floor(totalMin / 60);
    const mm = totalMin % 60;
    return `${hh}h ${mm.toString().padStart(2, "0")}p`;
  };

  if (isOwner) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Chấm Công</CardTitle>
            <CardDescription>Tính năng chấm công dành cho nhân viên</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Vui lòng vào <strong>Cài đặt → Lương</strong> để quản lý mã QR và xem lương nhân viên.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-8 px-4 md:px-0">
      {/* Header và Status Badge */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-wider text-gray-900 dark:text-amber-500 uppercase">Chấm Công</h1>
          <p className="text-xs font-semibold text-muted-foreground mt-1">Quét mã QR để bắt đầu / kết thúc ca làm việc</p>
        </div>
        <Badge 
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-black tracking-wider shadow-sm uppercase border",
            isCheckedIn 
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
              : isCheckedOut 
                ? "bg-gray-100 text-gray-500 border-gray-200" 
                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          )}
        >
          {isCheckedIn ? "Trong Ca Làm" : isCheckedOut ? "Đã Hết Ca" : "Chưa Vào Ca"}
        </Badge>
      </div>

      {/* Máy quét QR */}
      <Card className="border border-gray-200/80 dark:border-border rounded-[2.5rem] overflow-hidden shadow-sm bg-white dark:bg-card">
        <CardContent className="pt-6 pb-6 px-6 space-y-4">
          <Button
            onClick={() => setScanMode("checkin")}
            disabled={loading || isCheckedIn || isCheckedOut}
            size="lg"
            className="w-full h-16 text-base font-black tracking-widest bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl shadow-md shadow-emerald-500/10 hover:shadow-lg active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ScanLine className="w-6 h-6 mr-3 stroke-[2.5]" />
            QUÉT QR ĐỂ CHECK-IN
          </Button>
          <Button
            onClick={() => setScanMode("checkout")}
            disabled={loading || !isCheckedIn}
            size="lg"
            className="w-full h-16 text-base font-black tracking-widest bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white rounded-2xl shadow-md shadow-red-500/10 hover:shadow-lg active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ScanLine className="w-6 h-6 mr-3 stroke-[2.5]" />
            QUÉT QR ĐỂ CHECK-OUT
          </Button>
          {isCheckedOut && (
            <p className="text-xs text-center font-bold text-emerald-600 bg-emerald-500/5 py-2.5 rounded-xl border border-emerald-500/10">
              🎉 Bạn đã kết thúc ca làm hôm nay. Hẹn gặp lại ngày mai!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Ca Làm Hôm Nay */}
      <Card className="border border-gray-200/80 dark:border-border rounded-[2.5rem] overflow-hidden shadow-sm bg-white dark:bg-card">
        <CardHeader className="pb-3 px-6 pt-6 border-b border-gray-100 dark:border-border/30">
          <CardTitle className="flex items-center gap-2.5 text-lg font-black text-gray-800 dark:text-amber-500 tracking-wider">
            <Timer className="w-5 h-5 text-amber-500" />
            CA LÀM HÔM NAY
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {todayStatus?.checkIn ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50/80 dark:bg-secondary/40 rounded-2xl border border-gray-100/50 dark:border-border/30">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    <Play className="w-3 h-3 text-emerald-500 stroke-[3]" />
                    Vào ca
                  </div>
                  <div className="text-xl font-black text-gray-800 dark:text-foreground">
                    {format(new Date(todayStatus.checkIn), "HH:mm")}
                  </div>
                </div>
                <div className="p-4 bg-gray-50/80 dark:bg-secondary/40 rounded-2xl border border-gray-100/50 dark:border-border/30">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    <Square className="w-3 h-3 text-red-500 stroke-[3]" />
                    Hết ca
                  </div>
                  <div className="text-xl font-black text-gray-800 dark:text-foreground">
                    {todayStatus.checkOut ? format(new Date(todayStatus.checkOut), "HH:mm") : "—:—"}
                  </div>
                </div>
              </div>
              <div className="p-5 bg-amber-500/5 dark:bg-amber-950/10 rounded-2xl text-center border border-amber-500/20">
                <p className="text-xs font-extrabold text-amber-600/80 uppercase tracking-widest">Thời gian làm việc</p>
                <p className="text-3xl font-black text-amber-500 mt-1">
                  {todayStatus.totalHours
                    ? formatHours(getHoursFromDb(todayStatus.totalHours))
                    : isCheckedIn
                      ? formatHours(currentHours)
                      : "0h 00p"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-center font-bold text-muted-foreground py-6 text-sm">Chưa ghi nhận ca làm việc hôm nay.</p>
          )}
        </CardContent>
      </Card>

      {/* Lương Tạm Tính */}
      <Card className="border border-gray-200/80 dark:border-border rounded-[2.5rem] overflow-hidden shadow-sm bg-white dark:bg-card">
        <CardHeader className="pb-3 px-6 pt-6 border-b border-gray-100 dark:border-border/30">
          <CardTitle className="flex items-center gap-2.5 text-lg font-black text-gray-800 dark:text-amber-500 tracking-wider">
            <DollarSign className="w-5 h-5 text-amber-500" />
            LƯƠNG TẠM TÍNH
          </CardTitle>
          <CardDescription className="text-xs font-bold text-gray-400">Lương cơ bản: {hourlyRate.toLocaleString()}đ / giờ</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-gray-50/80 dark:bg-secondary/40 rounded-2xl text-center border border-gray-100/50 dark:border-border/30">
              <Clock className="w-5 h-5 mx-auto mb-2 text-amber-500" />
              <p className="text-xl font-black text-gray-800 dark:text-foreground">{formatHours(totalHours)}</p>
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mt-1">Tổng giờ làm</p>
            </div>
            <div className="p-5 bg-emerald-500/5 dark:bg-emerald-950/10 rounded-2xl text-center border border-emerald-500/20">
              <DollarSign className="w-5 h-5 mx-auto mb-2 text-emerald-500" />
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {Math.round(estimatedEarnings).toLocaleString()}đ
              </p>
              <p className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider mt-1">Lương tạm tính</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lịch Sử Chấm Công */}
      <Card className="border border-gray-200/80 dark:border-border rounded-[2.5rem] overflow-hidden shadow-sm bg-white dark:bg-card">
        <CardHeader className="pb-3 px-6 pt-6 border-b border-gray-100 dark:border-border/30">
          <CardTitle className="flex items-center gap-2.5 text-lg font-black text-gray-800 dark:text-amber-500 tracking-wider">
            <History className="w-5 h-5 text-amber-500" />
            LỊCH SỬ CHẤM CÔNG
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
            {records.length === 0 ? (
              <p className="text-center font-bold text-muted-foreground py-6 text-sm">Chưa có lịch sử chấm công.</p>
            ) : (
              records.slice(0, 20).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 bg-white dark:bg-card border border-gray-100 hover:border-amber-200/40 rounded-2xl shadow-sm transition-all duration-300">
                  <div>
                    <p className="font-extrabold text-sm text-gray-900 dark:text-foreground tracking-wide">{record.date}</p>
                    <p className="text-xs font-bold text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {record.checkIn && format(new Date(record.checkIn), "HH:mm")}
                      {record.checkOut && ` → ${format(new Date(record.checkOut), "HH:mm")}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge 
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                        record.status === "checked_out" 
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                          : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      )}
                    >
                      {record.status === "checked_out" ? "Hoàn thành" : "Đang làm"}
                    </Badge>
                    {record.totalHours && (
                      <p className="text-xs font-black text-gray-800 dark:text-foreground mt-1.5">
                        +{formatHours(getHoursFromDb(record.totalHours))}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <QrScanner
        open={scanMode === "checkin"}
        onClose={() => setScanMode(null)}
        onScan={handleScan}
        title="Quét QR để CHECK-IN"
        description="Hướng camera vào mã QR hiển thị trên màn hình quán"
      />
      <QrScanner
        open={scanMode === "checkout"}
        onClose={() => setScanMode(null)}
        onScan={handleScan}
        title="Quét QR để CHECK-OUT"
        description="Hướng camera vào mã QR hiển thị trên màn hình quán"
      />
    </div>
  );
}