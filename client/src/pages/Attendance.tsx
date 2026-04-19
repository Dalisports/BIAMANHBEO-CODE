import { useState, useEffect, useMemo } from "react";
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

  const [scanMode, setScanMode] = useState<ScanMode>(null);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [hourlyRate, setHourlyRate] = useState(50000);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!isOwner) {
      fetchMyAttendance();
      fetchHourlyRate();
    }
  }, [isOwner]);

  const fetchMyAttendance = async () => {
    try {
      const res = await fetch("/api/attendance/my", { headers: getAuthHeaders() });
      const data = await res.json();
      setRecords(data);
    } catch (err) {
      console.error("Error fetching attendance:", err);
    }
  };

  const fetchHourlyRate = async () => {
    try {
      const res = await fetch("/api/attendance/rate", { headers: getAuthHeaders() });
      const data = await res.json();
      setHourlyRate(data.hourlyRate || 50000);
    } catch (err) {
      console.error("Error fetching hourly rate:", err);
    }
  };

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
        fetchMyAttendance();
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
    <div className="space-y-4 max-w-2xl mx-auto pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chấm Công</h1>
          <p className="text-sm text-muted-foreground">Quét mã QR để bắt đầu / kết thúc ca</p>
        </div>
        <Badge variant={isCheckedIn ? "default" : isCheckedOut ? "secondary" : "outline"}>
          {isCheckedIn ? "Đang trong ca" : isCheckedOut ? "Đã hết ca" : "Chưa vào ca"}
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <Button
            onClick={() => setScanMode("checkin")}
            disabled={loading || isCheckedIn || isCheckedOut}
            size="lg"
            className="w-full h-16 text-base font-bold bg-green-600 hover:bg-green-700"
          >
            <ScanLine className="w-6 h-6 mr-3" />
            QUÉT QR ĐỂ CHECK-IN
          </Button>
          <Button
            onClick={() => setScanMode("checkout")}
            disabled={loading || !isCheckedIn}
            size="lg"
            variant="destructive"
            className="w-full h-16 text-base font-bold"
          >
            <ScanLine className="w-6 h-6 mr-3" />
            QUÉT QR ĐỂ CHECK-OUT
          </Button>
          {isCheckedOut && (
            <p className="text-xs text-center text-muted-foreground">
              Bạn đã kết thúc ca làm hôm nay. Hẹn gặp lại ngày mai.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Timer className="w-5 h-5" />
            Ca Làm Hôm Nay
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayStatus?.checkIn ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Play className="w-3 h-3 text-green-500" />
                    Vào ca
                  </div>
                  <div className="text-lg font-bold">
                    {format(new Date(todayStatus.checkIn), "HH:mm")}
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Square className="w-3 h-3 text-red-500" />
                    Hết ca
                  </div>
                  <div className="text-lg font-bold">
                    {todayStatus.checkOut ? format(new Date(todayStatus.checkOut), "HH:mm") : "—"}
                  </div>
                </div>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-center border border-amber-200 dark:border-amber-900">
                <p className="text-xs text-muted-foreground">Số giờ làm hôm nay</p>
                <p className="text-3xl font-black text-amber-600 dark:text-amber-400">
                  {todayStatus.totalHours
                    ? formatHours(getHoursFromDb(todayStatus.totalHours))
                    : isCheckedIn
                      ? formatHours(currentHours)
                      : "0h 00p"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">Chưa check-in hôm nay</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-5 h-5" />
            Lương Tạm Tính
          </CardTitle>
          <CardDescription>Lương 1 giờ: {hourlyRate.toLocaleString()}đ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-muted rounded-xl text-center">
              <Clock className="w-5 h-5 mx-auto mb-2 text-amber-500" />
              <p className="text-xl font-black">{formatHours(totalHours)}</p>
              <p className="text-xs text-muted-foreground">Tổng giờ làm</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-xl text-center border border-green-200 dark:border-green-900">
              <DollarSign className="w-5 h-5 mx-auto mb-2 text-green-500" />
              <p className="text-xl font-black text-green-600 dark:text-green-400">
                {Math.round(estimatedEarnings).toLocaleString()}đ
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">Lương tạm tính</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="w-5 h-5" />
            Lịch Sử Chấm Công
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {records.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Chưa có lịch sử</p>
            ) : (
              records.slice(0, 20).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{record.date}</p>
                    <p className="text-sm text-muted-foreground">
                      {record.checkIn && format(new Date(record.checkIn), "HH:mm")}
                      {record.checkOut && ` → ${format(new Date(record.checkOut), "HH:mm")}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={record.status === "checked_out" ? "default" : "secondary"}>
                      {record.status === "checked_out" ? "Hoàn thành" : "Đang làm"}
                    </Badge>
                    {record.totalHours && (
                      <p className="text-sm font-bold mt-1">{formatHours(getHoursFromDb(record.totalHours))}</p>
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
