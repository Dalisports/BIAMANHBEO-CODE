import { useState, useEffect } from "react";
import { useAuth, getAuthHeaders } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Profile {
  id?: number;
  userId?: number;
  fullName: string | null;
  dateOfBirth: string | null;
  hometown: string | null;
  idCardNumber: string | null;
  phoneNumber: string | null;
  isLocked: boolean;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
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
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  const isLocked = profile?.isLocked;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Thông tin cá nhân</h1>
        {isLocked && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <span>Đã khóa</span>
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin nhân viên</CardTitle>
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

          {!isLocked && (
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Đang lưu..." : "Lưu thông tin"}
            </Button>
          )}

          {isLocked && (
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