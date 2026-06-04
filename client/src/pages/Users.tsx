import { useState, useMemo } from "react";
import { useAuth, useUsers, useUpdateUser, useDeleteUser, SystemUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users as UsersIcon, Search, Plus, Pencil, Trash2, Loader2, Shield, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type UserFormData = {
  username: string;
  password?: string;
  role: "owner" | "admin" | "employee";
  fullName: string;
};

export default function Users() {
  const { user: currentUser, isOwner } = useAuth();
  const { toast } = useToast();
  const { data: users, isLoading } = useUsers();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [userForm, setUserForm] = useState<UserFormData>({
    username: "",
    password: "",
    role: "employee",
    fullName: "",
  });
  const [savingUser, setSavingUser] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<SystemUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      const matchesSearch =
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        (u.fullName?.toLowerCase() || "").includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.isActive) ||
        (statusFilter === "inactive" && !u.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const openCreateModal = () => {
    setEditingUser(null);
    setUserForm({ username: "", password: "", role: "employee", fullName: "" });
    setShowUserModal(true);
  };

  const openEditModal = (user: SystemUser) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      password: "",
      role: user.role as "owner" | "admin" | "employee",
      fullName: user.fullName || "",
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.username.trim()) {
      toast({ title: "Lỗi", description: "Username không được để trống", variant: "destructive" });
      return;
    }
    if (!editingUser && !userForm.password?.trim()) {
      toast({ title: "Lỗi", description: "Password không được để trống khi tạo mới", variant: "destructive" });
      return;
    }

    setSavingUser(true);
    try {
      const res = await fetch(editingUser ? `/api/users/${editingUser.id}` : "/api/auth/register", {
        method: editingUser ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        body: JSON.stringify({
          username: userForm.username,
          ...(userForm.password && { password: userForm.password }),
          role: userForm.role,
          fullName: userForm.fullName || null,
          ...(editingUser && { isActive: editingUser.isActive }),
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save user");
      }

      toast({ title: "Thành công", description: editingUser ? "Đã cập nhật user" : "Đã tạo user mới" });
      setShowUserModal(false);
      // Refresh users list
      window.dispatchEvent(new Event("focus"));
    } catch (err: any) {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!showDeleteConfirm) return;
    setDeletingUser(true);
    try {
      const res = await fetch(`/api/users/${showDeleteConfirm.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete user");
      toast({ title: "Thành công", description: "Đã xóa user" });
      setShowDeleteConfirm(null);
    } catch (err: any) {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    } finally {
      setDeletingUser(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return <Badge className="bg-amber-500">Chủ Quán</Badge>;
      case "admin":
        return <Badge className="bg-blue-500">Admin</Badge>;
      default:
        return <Badge variant="secondary">Nhân Viên</Badge>;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner":
        return "Chủ Quán";
      case "admin":
        return "Admin";
      default:
        return "Nhân Viên";
    }
  };

  if (!isOwner) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Bạn không có quyền truy cập trang này</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản Lý Người Dùng</h1>
          <p className="text-muted-foreground text-sm">Quản lý tài khoản và phân quyền nhân viên</p>
        </div>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Thêm User
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Danh Sách Users
          </CardTitle>
          <CardDescription>
            {filteredUsers?.length || 0} user{filteredUsers?.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm username, họ tên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="owner">Chủ Quán</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="employee">Nhân Viên</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Bị khóa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredUsers?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UsersIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Không tìm thấy user nào</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Họ tên
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getRoleBadge(u.role)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.fullName || "—"}</td>
                      <td className="px-4 py-3">
                        {u.isActive ? (
                          <span className="text-green-600 text-sm font-medium">Hoạt động</span>
                        ) : (
                          <span className="text-red-500 text-sm font-medium">Bị khóa</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString("vi-VN") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(u)}
                            disabled={u.id === currentUser?.userId}
                            className="gap-1"
                          >
                            <Pencil className="h-3 w-3" />
                            Sửa
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(u)}
                            disabled={u.id === currentUser?.userId || u.role === "owner"}
                            className="gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            Xóa
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Sửa User" : "Thêm User Mới"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Cập nhật thông tin user" : "Tạo tài khoản nhân viên mới"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                placeholder="Nhập username"
                disabled={!!editingUser}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password {editingUser && "(để trống nếu không đổi)"}</label>
              <Input
                type="password"
                value={userForm.password || ""}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder={editingUser ? "Để trống..." : "Nhập password"}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={userForm.role}
                onValueChange={(v) => setUserForm({ ...userForm, role: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Chủ Quán</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employee">Nhân Viên</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Họ tên</label>
              <Input
                value={userForm.fullName}
                onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                placeholder="Nhập họ tên (tùy chọn)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserModal(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveUser} disabled={savingUser}>
              {savingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingUser ? "Lưu" : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa user</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa user{" "}
              <span className="font-semibold">{showDeleteConfirm?.username}</span>? Hành động này sẽ
              khóa tài khoản của user này.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={deletingUser}>
              {deletingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}