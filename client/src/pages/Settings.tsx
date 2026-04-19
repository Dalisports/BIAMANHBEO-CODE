import { useState, useEffect } from "react";
import { useAuth, getAuthHeaders } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePaymentSettings, useUpdatePaymentSetting, useDailyReport, useBestSellers, useOrders } from "@/hooks/use-orders";
import { X, DollarSign, TrendingUp, ShoppingBag, Users, Trophy } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface PaymentMethod {
  id: number;
  method: string;
  label: string;
  icon: string;
  qrImageUrl: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  additionalInfo: string;
  isEnabled: boolean;
}

export default function Settings() {
  const { isOwner } = useAuth();
  const { toast } = useToast();
  
  const [hourlyRate, setHourlyRate] = useState(50000);
  const [salaryData, setSalaryData] = useState<any[]>([]);
  const [savingRate, setSavingRate] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    dateOfBirth: "",
    hometown: "",
    idCardNumber: "",
    phoneNumber: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const { data: paymentSettings } = usePaymentSettings();
  const updatePaymentSetting = useUpdatePaymentSetting();
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    label: "",
    icon: "",
    qrImageUrl: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
    additionalInfo: "",
    isEnabled: true,
  });

  const { data: report, isLoading: loadingReport } = useDailyReport();
  const { data: bestSellers, isLoading: loadingBestSellers } = useBestSellers();
  const { data: orders } = useOrders();

  const totalRevenue = orders?.filter((o) => o.paymentStatus === "Paid").reduce((acc, o) => acc + o.totalAmount, 0) || 0;
  const todayOrders = orders?.length || 0;
  const paidOrders = orders?.filter((o) => o.paymentStatus === "Paid").length || 0;

  const getDefaultMethods = () => [
    { id: "cash", label: "Tiền mặt", icon: "💵" },
    { id: "transfer", label: "Chuyển khoản", icon: "🏦" },
    { id: "vnpay", label: "VNPay", icon: "💳" },
    { id: "momo", label: "MoMo", icon: "📱" },
  ];

  const getMethodConfig = (methodId: string) => {
    const defaults = getDefaultMethods().find(m => m.id === methodId);
    const custom = paymentSettings?.find(p => p.method === methodId);
    return {
      id: methodId,
      label: custom?.label || defaults?.label || methodId,
      icon: custom?.icon || defaults?.icon || "💳",
      qrImageUrl: custom?.qrImageUrl || null,
      accountName: custom?.accountName || null,
      accountNumber: custom?.accountNumber || null,
      bankName: custom?.bankName || null,
      additionalInfo: custom?.additionalInfo || null,
      isEnabled: custom?.isEnabled ?? true,
    };
  };

  const openPaymentSettings = (methodId: string) => {
    const config = getMethodConfig(methodId);
    setEditingPayment(methodId);
    setPaymentForm({
      label: config.label,
      icon: config.icon,
      qrImageUrl: config.qrImageUrl || "",
      accountName: config.accountName || "",
      accountNumber: config.accountNumber || "",
      bankName: config.bankName || "",
      additionalInfo: config.additionalInfo || "",
      isEnabled: config.isEnabled,
    });
  };

  const handleSavePayment = async () => {
    if (!editingPayment) return;
    try {
      await updatePaymentSetting.mutateAsync({ method: editingPayment, ...paymentForm });
      toast({ title: "Đã lưu cài đặt thanh toán" });
      setEditingPayment(null);
    } catch (err) {
      toast({ title: "Lỗi", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchSalaryData();
    } else {
      fetchProfile();
    }
  }, [isOwner]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/auth/profile", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        if (data) {
          setProfileForm({
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
      setProfileLoading(false);
    }
  };

  const fetchSalaryData = async () => {
    try {
      const res = await fetch("/api/attendance/all", { headers: getAuthHeaders() });
      const data = await res.json();
      
      setHourlyRate(data.hourlyRate || 50000);
      
      const userSalaries: Record<number, { username: string; fullName: string; totalHours: number; totalSalary: number }> = {};
      
      for (const record of data.records || []) {
        const uid = record.userId;
        if (!userSalaries[uid]) {
          userSalaries[uid] = {
            username: record.username,
            fullName: record.fullName,
            totalHours: 0,
            totalSalary: 0
          };
        }
        userSalaries[uid].totalHours += record.totalHours || 0;
      }
      
      const salaryList = Object.entries(userSalaries).map(([uid, info]) => ({
        userId: Number(uid),
        username: info.username,
        fullName: info.fullName || info.username,
        totalHours: info.totalHours,
        totalSalary: Math.round(info.totalHours * (data.hourlyRate || 50000))
      }));
      
      setSalaryData(salaryList);
    } catch (err) {
      console.error("Error fetching salary data:", err);
    }
  };

  const [dashboardData, setDashboardData] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    activeTables: 0,
    totalEmployees: 0,
  });

  useEffect(() => {
    if (isOwner) {
      fetchDashboard();
    }
  }, [isOwner]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/reports/daily", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDashboardData({
          todayRevenue: data.totalRevenue || 0,
          todayOrders: data.totalOrders || 0,
          activeTables: data.activeTables || 0,
          totalEmployees: 0,
        });
      }
    } catch (err) {
      console.error("Error fetching dashboard:", err);
    }
  };

  const handleSaveHourlyRate = async () => {
    setSavingRate(true);
    try {
      const res = await fetch("/api/attendance/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ hourlyRate }),
      });
      if (res.ok) {
        toast({ title: "Đã lưu lương giờ" });
        fetchSalaryData();
      }
    } catch (err) {
      toast({ title: "Lỗi", variant: "destructive" });
    } finally {
      setSavingRate(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(profileForm),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        toast({ title: "Đã lưu thông tin" });
      }
    } catch (err) {
      toast({ title: "Lỗi", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const totalSalaryAll = salaryData.reduce((sum, emp) => sum + emp.totalSalary, 0);
  const totalHoursAll = salaryData.reduce((sum, emp) => sum + emp.totalHours, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cài đặt</h1>
        {isOwner && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
            Chỉ dành cho Chủ Quán
          </Badge>
        )}
      </div>

      <Tabs defaultValue="dashboard" className="w-full" key={isOwner ? "owner" : "employee"}>
        <TabsList className={isOwner ? "grid w-full grid-cols-3" : "grid w-full grid-cols-1"}>
          {!isOwner && <TabsTrigger value="personal">Cá Nhân</TabsTrigger>}
          {isOwner && <TabsTrigger value="dashboard">Tổng quan</TabsTrigger>}
          {isOwner && <TabsTrigger value="salary">Lương</TabsTrigger>}
          {isOwner && <TabsTrigger value="payment">Thanh toán</TabsTrigger>}
        </TabsList>

        {isOwner && (
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-500 rounded-2xl p-5 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <DollarSign className="w-8 h-8" />
                  <TrendingUp className="w-5 h-5 opacity-60" />
                </div>
                <p className="text-sm opacity-80">Doanh thu hôm nay</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(report?.todayRevenue || 0)}</p>
              </div>
              <div className="bg-blue-500 rounded-2xl p-5 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <p className="text-sm opacity-80">Đơn hàng</p>
                <p className="text-2xl font-bold mt-1">{todayOrders}</p>
              </div>
              <div className="bg-orange-500 rounded-2xl p-5 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <Users className="w-8 h-8" />
                </div>
                <p className="text-sm opacity-80">Đơn đã thanh toán</p>
                <p className="text-2xl font-bold mt-1">{paidOrders}</p>
              </div>
              <div className="bg-purple-500 rounded-2xl p-5 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <Trophy className="w-8 h-8" />
                </div>
                <p className="text-sm opacity-80">Tổng doanh thu</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Món bán chạy</CardTitle>
                <CardDescription>Top món được đặt nhiều nhất</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bestSellers?.slice(0, 10).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-bold text-sm flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold">{item.totalQuantity} đã bán</span>
                    </div>
                  ))}
                  {(!bestSellers || bestSellers.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">Chưa có dữ liệu</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {!isOwner && (
          <TabsContent value="personal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin cá nhân</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Họ và tên</label>
                  <Input
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    disabled={profile?.isLocked}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Ngày tháng năm sinh</label>
                  <Input
                    type="date"
                    value={profileForm.dateOfBirth}
                    onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                    disabled={profile?.isLocked}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Quê quán</label>
                  <Input
                    value={profileForm.hometown}
                    onChange={(e) => setProfileForm({ ...profileForm, hometown: e.target.value })}
                    disabled={profile?.isLocked}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Số CMND/CCCD</label>
                  <Input
                    value={profileForm.idCardNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, idCardNumber: e.target.value })}
                    maxLength={12}
                    disabled={profile?.isLocked}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Số điện thoại</label>
                  <Input
                    value={profileForm.phoneNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                    maxLength={10}
                    disabled={profile?.isLocked}
                  />
                </div>
                {!profile?.isLocked && (
                  <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
                    {savingProfile ? "Đang lưu..." : "Lưu thông tin"}
                  </Button>
                )}
                {profile?.isLocked && (
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Thông tin đã khóa. Liên hệ Chủ Quán để thay đổi.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isOwner && (
          <>
            <TabsContent value="salary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cấu hình lương</CardTitle>
                  <CardDescription>Thiết lập lương giờ và xem lương nhân viên</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium">Lương 1 giờ (VNĐ)</label>
                      <Input
                        type="number"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(Number(e.target.value))}
                      />
                    </div>
                    <Button onClick={handleSaveHourlyRate} disabled={savingRate}>
                      {savingRate ? "Đang lưu..." : "Lưu"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Danh sách lương nhân viên</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 p-4 bg-amber-50 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng giờ làm</p>
                      <p className="text-xl font-black">{totalHoursAll.toFixed(1)}h</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Tổng lương</p>
                      <p className="text-xl font-black text-green-600">{totalSalaryAll.toLocaleString()}đ</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {salaryData.map(emp => (
                      <div key={emp.userId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{emp.fullName}</p>
                          <p className="text-sm text-muted-foreground">{emp.totalHours.toFixed(1)}h</p>
                        </div>
                        <p className="font-bold text-green-600">{emp.totalSalary.toLocaleString()}đ</p>
                      </div>
                    ))}
                    {salaryData.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">Chưa có dữ liệu</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cấu hình thanh toán</CardTitle>
                  <CardDescription>Cài đặt các phương thức thanh toán</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {getDefaultMethods().map((method) => {
                      const config = getMethodConfig(method.id);
                      return (
                        <button
                          key={method.id}
                          onClick={() => openPaymentSettings(method.id)}
                          className={cn(
                            "p-4 rounded-xl border-2 transition-all text-left relative",
                            editingPayment === method.id 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <span className="text-2xl">{config.icon}</span>
                          <span className="block font-semibold mt-1">{config.label}</span>
                          {(config.qrImageUrl || config.accountNumber) && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {editingPayment && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getMethodConfig(editingPayment).icon}</span>
                          <h4 className="font-bold">Cài đặt: {getMethodConfig(editingPayment).label}</h4>
                        </div>
                        <button onClick={() => setEditingPayment(null)} className="p-2 rounded-lg hover:bg-secondary">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block">Tên hiển thị</label>
                        <Input
                          value={paymentForm.label}
                          onChange={(e) => setPaymentForm({ ...paymentForm, label: e.target.value })}
                          placeholder="VD: Chuyển khoản MB Bank"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block">Icon (emoji)</label>
                        <Input
                          value={paymentForm.icon}
                          onChange={(e) => setPaymentForm({ ...paymentForm, icon: e.target.value })}
                          placeholder="VD: 🏦"
                        />
                      </div>

                      {editingPayment !== "cash" && (
                        <>
                          <div>
                            <label className="text-sm font-medium mb-1 block">URL Ảnh QR</label>
                            <Input
                              value={paymentForm.qrImageUrl}
                              onChange={(e) => setPaymentForm({ ...paymentForm, qrImageUrl: e.target.value })}
                              placeholder="https://..."
                            />
                            {paymentForm.qrImageUrl && (
                              <div className="mt-2">
                                <img src={paymentForm.qrImageUrl} alt="Preview" className="h-24 rounded-lg border" onError={(e) => e.currentTarget.style.display = 'none'} />
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium mb-1 block">Tên tài khoản</label>
                              <Input
                                value={paymentForm.accountName}
                                onChange={(e) => setPaymentForm({ ...paymentForm, accountName: e.target.value })}
                                placeholder="VD: NGUYEN VAN A"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">Số tài khoản</label>
                              <Input
                                value={paymentForm.accountNumber}
                                onChange={(e) => setPaymentForm({ ...paymentForm, accountNumber: e.target.value })}
                                placeholder="VD: 1234567890"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-1 block">Tên ngân hàng</label>
                            <Input
                              value={paymentForm.bankName}
                              onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                              placeholder="VD: MB Bank"
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-1 block">Thông tin thêm</label>
                            <Input
                              value={paymentForm.additionalInfo}
                              onChange={(e) => setPaymentForm({ ...paymentForm, additionalInfo: e.target.value })}
                              placeholder="Nội dung chuyển khoản..."
                            />
                          </div>
                        </>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isEnabled"
                          checked={paymentForm.isEnabled}
                          onChange={(e) => setPaymentForm({ ...paymentForm, isEnabled: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <label htmlFor="isEnabled" className="text-sm font-medium">Bật phương thức này</label>
                      </div>

                      <Button onClick={handleSavePayment} disabled={updatePaymentSetting.isPending} className="w-full">
                        {updatePaymentSetting.isPending ? "Đang lưu..." : "Lưu cài đặt"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}