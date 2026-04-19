import { useState, useEffect } from "react";
import { useAuth, getAuthHeaders } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { QrCode, Clock, DollarSign, History, Play, Square, Camera, Timer } from "lucide-react";

interface AttendanceRecord {
  id: number;
  userId: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  totalHours: number | null;
  status: string;
}

export default function Attendance() {
  const { user, isOwner } = useAuth();
  const { toast } = useToast();
  
  const [todayQR, setTodayQR] = useState<any>(null);
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [hourlyRate, setHourlyRate] = useState(50000);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!isOwner) {
      fetchQR();
      fetchMyAttendance();
      fetchHourlyRate();
    }
  }, [isOwner]);

  useEffect(() => {
    if (isCheckedIn) {
      const interval = setInterval(() => {
        setNow(new Date());
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isCheckedIn]);

  const fetchQR = async () => {
    try {
      const res = await fetch("/api/attendance/qr");
      const data = await res.json();
      setTodayQR(data);
    } catch (err) {
      console.error("Error fetching QR:", err);
    }
  };

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

  const handleCheckIn = async (qrCode?: string) => {
    const code = qrCode || manualCode;
    if (!code.trim()) {
      toast({ title: "Nhập mã QR", description: "Vui lòng nhập mã QR từ hệ thống", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ qrCode: code }),
      });
      if (res.ok) {
        toast({ title: "Check-in thành công", description: "Bạn đã bắt đầu ca làm việc" });
        setManualCode("");
        fetchMyAttendance();
      } else {
        const data = await res.json();
        toast({ title: "Check-in thất bại", description: data.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Lỗi", description: "Không thể check-in", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (qrCode?: string) => {
    const code = qrCode || manualCode;
    if (!code.trim()) {
      toast({ title: "Nhập mã QR", description: "Vui lòng nhập mã QR từ hệ thống", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ qrCode: code }),
      });
      if (res.ok) {
        toast({ title: "Check-out thành công", description: "Bạn đã kết thúc ca làm việc" });
        setManualCode("");
        fetchMyAttendance();
      } else {
        const data = await res.json();
        toast({ title: "Check-out thất bại", description: data.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Lỗi", description: "Không thể check-out", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getTodayStatus = () => {
    const today = new Date().toISOString().split("T")[0];
    const todayRecord = records.find(r => r.date === today);
    if (!todayRecord) return null;
    return todayRecord;
  };

  const todayStatus = getTodayStatus();
  const isCheckedIn = todayStatus?.status === "checked_in";
  const isCheckedOut = todayStatus?.status === "checked_out";

  const calculateCurrentHours = () => {
    if (!todayStatus?.checkIn) return 0;
    const checkInTime = new Date(todayStatus.checkIn).getTime();
    const current = now.getTime();
    const diffMs = current - checkInTime;
    return diffMs / (1000 * 60 * 60);
  };

  const getHoursFromDb = (hours: number | null) => {
    if (!hours) return 0;
    return hours / 100;
  };

  const currentHours = isCheckedIn ? calculateCurrentHours() : 0;
  const totalHistoricalHours = records.reduce((sum, r) => sum + getHoursFromDb(r.totalHours), 0);
  const totalHours = totalHistoricalHours + currentHours;
  const estimatedEarnings = totalHours * hourlyRate;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Chấm Công</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Mã QR Hôm Nay
          </CardTitle>
          <CardDescription>Quét mã để chấm công</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayQR && (
            <div className="p-4 bg-muted rounded-xl text-center">
              <p className="text-2xl font-black font-mono letter-spacing-4">{todayQR.qrCode}</p>
              <p className="text-sm text-muted-foreground mt-2">Hết hạn lúc 23:59</p>
            </div>
          )}
          
          <Input
            placeholder="Nhập mã QR..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            className="font-mono"
          />

          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => handleCheckIn()} 
              disabled={loading || !manualCode.trim() || isCheckedIn}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-2" />
              QUÉT QR ĐỂ CHECK-IN
            </Button>
            <Button 
              onClick={() => handleCheckOut()} 
              disabled={loading || !manualCode.trim() || !isCheckedIn || isCheckedOut}
              variant="destructive"
              className="flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              QUÉT QR ĐỂ CHECK-OUT
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            Giờ Làm Hôm Nay
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayStatus?.checkIn && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Check-in lúc</span>
                </div>
                <span className="font-bold">{format(new Date(todayStatus.checkIn), "HH:mm")}</span>
              </div>
              {todayStatus.checkOut && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Square className="w-4 h-4 text-red-500" />
                    <span className="text-sm">Check-out lúc</span>
                  </div>
                  <span className="font-bold">{format(new Date(todayStatus.checkOut), "HH:mm")}</span>
                </div>
              )}
              <div className="p-4 bg-amber-50 rounded-xl text-center border border-amber-200">
                <p className="text-sm text-muted-foreground">Số giờ làm hôm nay</p>
                <p className="text-2xl font-black text-amber-600">
                  {todayStatus.totalHours ? `${getHoursFromDb(todayStatus.totalHours)}h` : isCheckedIn ? `${currentHours.toFixed(1)}h` : '0h'}
                </p>
              </div>
            </div>
          )}
          {!todayStatus && (
            <p className="text-center text-muted-foreground py-4">Chưa check-in hôm nay</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Lương Tạm Tính
          </CardTitle>
          <CardDescription>Lương 1 giờ: {hourlyRate.toLocaleString()}đ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-xl text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-amber-500" />
              <p className="text-2xl font-black">{totalHours.toFixed(1)}h</p>
              <p className="text-sm text-muted-foreground">Tổng giờ làm</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl text-center border border-green-200">
              <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-black text-green-600">{estimatedEarnings.toLocaleString()}đ</p>
              <p className="text-sm text-green-600">Lương tạm tính</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Lịch Sử Chấm Công
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {records.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Chưa có lịch sử</p>
            ) : (
              records.slice(0, 10).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{record.date}</p>
                    <p className="text-sm text-muted-foreground">
                      {record.checkIn && format(new Date(record.checkIn), "HH:mm")}
                      {record.checkOut && ` - ${format(new Date(record.checkOut), "HH:mm")}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={record.status === "checked_out" ? "default" : "secondary"}>
                      {record.status === "checked_out" ? "Đã hoàn thành" : "Đang làm"}
                    </Badge>
                    {record.totalHours && (
                      <p className="text-sm font-medium mt-1">{getHoursFromDb(record.totalHours)}h</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}