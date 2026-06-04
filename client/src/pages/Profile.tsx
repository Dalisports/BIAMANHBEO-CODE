import { useState, useEffect } from "react";
import { useAuth, getAuthHeaders } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, ShoppingBag, Clock, Award, Loader2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface Profile {
  id?: number;
  userId?: number;
  fullName: string | null;
  dateOfBirth: string | null;
  hometown: string | null;
  idCardNumber: string | null;
  phoneNumber: string | null;
  isLocked: boolean;
  createdAt?: string;
}

interface Stats {
  totalOrders: number;
  hoursThisMonth: number;
  role: string;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    dateOfBirth: "",
    hometown: "",
    idCardNumber: "",
    phoneNumber: "",
  });

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/auth/profile", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        if (data) {
          setFormData({
            fullName: data.fullName || "",
            dateOfBirth: data.dateOfBirth || "",
            hometown: data.hometown || "",
            idCardNumber: data.idCardNumber || "",
            phoneNumber: data.phoneNumber || "",
          });
        }
      }
    } catch (err) {
      console.error("Fetch profile error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/auth/profile/stats", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Fetch stats error:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        toast({ title: "Lỗi", description: data.message, variant: "destructive" });
        return;
      }

      const updated = await res.json();
      setProfile(updated);
      toast({ title: "Đã lưu thông tin" });
    } catch (err) {
      toast({ title: "Lỗi", description: "Không thể lưu thông tin", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const isLocked = profile?.isLocked;
  const isOwner = user?.role === "owner";

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Profile Header Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-amber-400 to-yellow-500 p-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">
                {profile?.fullName || user?.username || "Nhân viên"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {isOwner ? (
                  <Badge className="bg-white/20 text-white border-0">Chủ Quán</Badge>
                ) : (
                  <Badge className="bg-white/20 text-white border-0">Nhân Viên</Badge>
                )}
                {isLocked && (
                  <Badge variant="destructive" className="bg-red-500/80 text-white border-0">
                    Đã khóa
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 text-center">
              <ShoppingBag className="w-6 h-6 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-black text-amber-600">{stats?.totalOrders || 0}</p>
              <p className="text-xs text-muted-foreground">Đơn hàng</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4 text-center">
              <Clock className="w-6 h-6 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-black text-blue-600">{stats?.hoursThisMonth?.toFixed(1) || 0}h</p>
              <p className="text-xs text-muted-foreground">Giờ làm tháng này</p>
            </div>
          </div>

          {/* Join date */}
          {profile?.createdAt && (
            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Tham gia: {new Date(profile.createdAt).toLocaleDateString("vi-VN")}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Thông tin cá nhân
          </CardTitle>
          <CardDescription>Cập nhật thông tin của bạn</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tên đăng nhập</label>
            <Input value={user?.username || ""} disabled className="bg-muted" />
          </div>

          <div>
            <label className="text-sm font-medium">Họ và tên</label>
            <Input
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              disabled={isLocked}
              placeholder="Nguyễn Văn A"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Ngày tháng năm sinh</label>
            <Input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              disabled={isLocked}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Quê quán</label>
            <Input
              value={formData.hometown}
              onChange={(e) => setFormData({ ...formData, hometown: e.target.value })}
              disabled={isLocked}
              placeholder="Xã..., Huyện..., Tỉnh..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">Số Chứng minh nhân dân (CMND/CCCD)</label>
            <Input
              value={formData.idCardNumber}
              onChange={(e) => setFormData({ ...formData, idCardNumber: e.target.value })}
              disabled={isLocked}
              placeholder="012345678901"
              maxLength={12}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Số điện thoại</label>
            <Input
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              disabled={isLocked}
              placeholder="0912345678"
              maxLength={10}
            />
          </div>

          {!isLocked ? (
            <Button onClick={handleSave} disabled={saving} className="w-full bg-amber-500 hover:bg-amber-600">
              {saving ? "Đang lưu..." : "Lưu thông tin"}
            </Button>
          ) : (
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                Thông tin đã được xác nhận và khóa. Liên hệ Chủ Quán để thay đổi.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}