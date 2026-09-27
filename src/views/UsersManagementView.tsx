import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  Database,
  RotateCcw,
  Clock,
  HardDrive,
  UserPlus,
  Eye,
  Building2,
  Mail,
  Phone,
  Lock,
  User,
  AlertCircle
} from 'lucide-react';
import { api } from '../api.js';
import { Modal } from '../components/ui/Modal.js';

interface UserRecord {
  id: number;
  username: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role_code: string;
  role_name_ar: string;
  is_active: number;
  branch_name: string | null;
  created_at: string;
}

interface RoleRecord {
  role_code: string;
  role_name_ar: string;
  description: string;
}

interface BranchRecord {
  id: number;
  branch_code?: string;
  branch_name: string;
  location?: string;
}

interface BackupRecord {
  filename: string;
  sizeBytes: number;
  sizeKb: number;
  createdAt: string;
}

export const UsersManagementView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'backups'>('users');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([
    { id: 1, branch_name: 'الفرع الرئيسي - نتش رول جروث' },
    { id: 2, branch_name: 'فرع مزارع المنطقة الشمالية' }
  ]);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    fullName: '',
    username: '',
    password: '',
    roleCode: 'SUPERVISOR',
    branchId: 1,
    email: '',
    phone: ''
  });

  // User Details Modal State
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserRecord | null>(null);

  // Backup & Restore State
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState<string | null>(null);

  // Auto-dismiss feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const loadData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [usersRes, rolesRes, branchesRes] = await Promise.all([
        api.getUsers(),
        api.getRoles(),
        api.getBranches().catch(() => ({ success: false, branches: [] }))
      ]);
      if (usersRes.success && usersRes.users) {
        setUsers(usersRes.users);
      }
      if (rolesRes.success && rolesRes.roles) {
        setRoles(rolesRes.roles);
      }
      if (branchesRes.success && branchesRes.branches && branchesRes.branches.length > 0) {
        setBranches(branchesRes.branches);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'فشل تحميل بيانات المستخدمين والصلاحيات' });
    } finally {
      setLoading(false);
    }
  };

  const loadBackups = async () => {
    try {
      const res = await api.getBackups();
      if (res.success) {
        setBackups(res.backups || []);
      }
    } catch (err: any) {
      console.error('Failed to load backups:', err);
    }
  };

  const handleCreateBackup = async () => {
    setBackupInProgress(true);
    setFeedback(null);
    try {
      const res = await api.createBackup();
      if (res.success) {
        setFeedback({ type: 'success', message: 'تم إنشاء نسخة احتياطية لقاعدة البيانات بنجاح.' });
        await loadBackups();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'فشل إنشاء النسخة الاحتياطية' });
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!window.confirm(`تنبيه: هل أنت متأكد من رغبتك في استعادة النسخة الاحتياطية (${filename})؟\nسيتم استرجاع بيانات النظام إلى توقيت هذه النسخة بأمان.`)) {
      return;
    }
    setRestoreInProgress(filename);
    setFeedback(null);
    try {
      const res = await api.restoreBackup(filename);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message || 'تم استعادة النسخة الاحتياطية بنجاح.' });
        await Promise.all([loadData(), loadBackups()]);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'فشل استعادة النسخة الاحتياطية' });
    } finally {
      setRestoreInProgress(null);
    }
  };

  useEffect(() => {
    loadData();
    loadBackups();
  }, []);

  const handleToggleStatus = async (user: UserRecord) => {
    try {
      const res = await api.toggleUserStatus(user.id);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: res.newStatus } : u));
        if (selectedUserForDetails && selectedUserForDetails.id === user.id) {
          setSelectedUserForDetails(prev => prev ? { ...prev, is_active: res.newStatus } : null);
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'فشل تغيير حالة المستخدم' });
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    const trimmedFullName = newUser.fullName.trim();
    const trimmedUsername = newUser.username.trim().toLowerCase();
    const trimmedPassword = newUser.password.trim();

    if (!trimmedFullName) {
      setFormError('يرجى إدخال الاسم الكامل للمستخدم');
      return;
    }
    if (!trimmedUsername) {
      setFormError('يرجى إدخال اسم الدخول (Username)');
      return;
    }
    if (trimmedUsername.length < 3) {
      setFormError('يجب أن يتكون اسم الدخول من 3 أحرف على الأقل');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setFormError('اسم الدخول يجب أن يحتوي فقط على أحرف إنجليزية وأرقام وعلامة _');
      return;
    }
    if (!trimmedPassword) {
      setFormError('يرجى تعيين كلمة المرور');
      return;
    }
    if (trimmedPassword.length < 4) {
      setFormError('يجب أن تتكون كلمة المرور من 4 خانات على الأقل');
      return;
    }
    if (!newUser.roleCode) {
      setFormError('يرجى اختيار الدور الوظيفي للمستخدم');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        fullName: trimmedFullName,
        username: trimmedUsername,
        password: trimmedPassword,
        roleCode: newUser.roleCode,
        branchId: Number(newUser.branchId) || 1,
        email: newUser.email.trim() || undefined,
        phone: newUser.phone.trim() || undefined
      };

      const res = await api.createUser(payload);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `تم إضافة المستخدم الجديد (${trimmedFullName}) بنجاح وربطه بالدور (${newUser.roleCode}).`
        });
        setIsAddUserModalOpen(false);
        setNewUser({
          fullName: '',
          username: '',
          password: '',
          roleCode: roles[0]?.role_code || 'SUPERVISOR',
          branchId: 1,
          email: '',
          phone: ''
        });
        await loadData();
      }
    } catch (err: any) {
      setFormError(err.message || 'فشل إضافة المستخدم الجديد');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="العودة للوحة التحكم"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-xl font-black text-slate-900">إدارة النظام، المستخدمين، والصيانة</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة الحسابات المعتمدة، إضافة مستخدمين جدد، الأدوار والصلاحيات، والنسخ الاحتياطي والصيانة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'users' && (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setIsAddUserModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة مستخدم جديد</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              loadData();
              loadBackups();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>تحديث البيانات</span>
          </button>

          {activeTab === 'backups' && (
            <button
              type="button"
              onClick={handleCreateBackup}
              disabled={backupInProgress}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-xs disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              <span>{backupInProgress ? 'جاري النسخ...' : 'إنشاء نسخة احتياطية الآن'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Operational Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>المستخدمون والأدوار ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('backups');
            loadBackups();
          }}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'backups'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>النسخ الاحتياطي والصيانة ({backups.length})</span>
        </button>
      </div>

      {/* Floating Temporary Feedback Toast */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-xs transition-all ${
          feedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* TAB 1: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">سجل المستخدمين المعتمدين</h2>
                <span className="text-[11px] bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                  {users.length} مستخدمين مسجلين
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setIsAddUserModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>إضافة مستخدم جديد</span>
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500 font-medium">جاري جلب بيانات المستخدمين...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">الاسم الكامل</th>
                      <th className="py-3 px-4">اسم الدخول</th>
                      <th className="py-3 px-4">الدور الوظيفي المعتمد</th>
                      <th className="py-3 px-4">الفرع</th>
                      <th className="py-3 px-4 text-center">الحالة</th>
                      <th className="py-3 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {users.map((u) => (
                      <tr key={`user-row-${u.id}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">{u.id}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{u.full_name}</td>
                        <td className="py-3 px-4 font-mono text-emerald-800 font-bold">@{u.username}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800">
                            <Shield className="w-3 h-3 text-emerald-600" />
                            <span>{u.role_name_ar}</span>
                            <span className="font-mono text-slate-500 font-normal">({u.role_code})</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{u.branch_name || 'الفرع الرئيسي'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.is_active === 1 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {u.is_active === 1 ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedUserForDetails(u)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 inline-flex items-center gap-1 transition-colors"
                              title="عرض بيانات وتفاصيل المستخدم"
                            >
                              <Eye className="w-3 h-3 text-slate-500" />
                              <span>التفاصيل</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                u.is_active === 1
                                  ? 'text-rose-700 hover:bg-rose-50 border border-rose-200'
                                  : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                              }`}
                            >
                              {u.is_active === 1 ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Role Catalog */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>الأدوار الوظيفية المعتمدة في النظام</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {roles.map((r) => (
                <div key={r.role_code} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">{r.role_name_ar}</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{r.role_code}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-1">{r.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BACKUPS & RESTORE */}
      {activeTab === 'backups' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">النسخ الاحتياطي واستعادة قاعدة البيانات</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    إنشاء واسترجاع لقطات آمنة لقاعدة البيانات التشغيلية مع ضمان استمرارية العمليات وسلامة البيانات.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={backupInProgress}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                <Database className="w-4 h-4" />
                <span>{backupInProgress ? 'جاري أخذ النسخة...' : 'إنشاء نسخة احتياطية جديدة الآن'}</span>
              </button>
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>سجل النسخ الاحتياطية المتوفرة ({backups.length})</span>
              </h4>

              {backups.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  لا توجد نسخ احتياطية مسجلة بعد. اضغط على "إنشاء نسخة احتياطية جديدة الآن" للبدء.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">اسم ملف النسخة</th>
                        <th className="p-3">الحجم</th>
                        <th className="p-3">تاريخ الإنشاء</th>
                        <th className="p-3 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {backups.map((b) => (
                        <tr key={b.filename} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-slate-800">{b.filename}</td>
                          <td className="p-3 font-mono text-slate-600">{b.sizeKb} KB</td>
                          <td className="p-3 font-mono text-slate-500">{new Date(b.createdAt).toLocaleString('ar-EG')}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRestoreBackup(b.filename)}
                              disabled={restoreInProgress !== null}
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{restoreInProgress === b.filename ? 'جاري الاستعادة...' : 'استعادة بأمان'}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW USER */}
      <Modal
        id="add-user-modal"
        isOpen={isAddUserModalOpen}
        onClose={() => {
          if (!formSubmitting) {
            setIsAddUserModalOpen(false);
            setFormError(null);
          }
        }}
        title="إضافة مستخدم جديد للنظام"
        subtitle="إنشاء حساب مستخدم معتمد وربطه بالدور الوظيفي والصلاحيات المناسبة"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateUserSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الاسم الكامل الرسمي <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="مثال: م. علي صالح"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  className="w-full pr-8 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم الدخول (Username) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="مثال: ali_saleh"
                  dir="ltr"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full pr-3 pl-8 py-2 text-xs rounded-xl border border-slate-200 text-left font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <span className="text-slate-400 font-mono text-xs absolute left-2.5 top-2.5">@</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">أحرف إنجليزية وأرقام وعلامة _ دون مسافات</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                كلمة المرور <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full pr-8 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الدور الوظيفي المعتمد <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={newUser.roleCode}
                  onChange={(e) => setNewUser({ ...newUser, roleCode: e.target.value })}
                  className="w-full pr-8 pl-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold text-slate-800"
                >
                  {roles.map((r) => (
                    <option key={r.role_code} value={r.role_code}>
                      {r.role_name_ar} ({r.role_code})
                    </option>
                  ))}
                </select>
                <Shield className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الفرع التابع له
              </label>
              <div className="relative">
                <select
                  value={newUser.branchId}
                  onChange={(e) => setNewUser({ ...newUser, branchId: Number(e.target.value) })}
                  className="w-full pr-8 pl-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.branch_name}
                    </option>
                  ))}
                </select>
                <Building2 className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم الهاتف (اختياري)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="05XXXXXXXX"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="w-full pr-8 pl-3 py-2 text-xs rounded-xl border border-slate-200 text-left focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              البريد الإلكتروني (اختياري)
            </label>
            <div className="relative">
              <input
                type="email"
                dir="ltr"
                placeholder="user@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full pr-8 pl-3 py-2 text-xs rounded-xl border border-slate-200 text-left focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={formSubmitting}
              onClick={() => {
                setIsAddUserModalOpen(false);
                setFormError(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{formSubmitting ? 'جاري الحفظ...' : 'تأكيد إضافة المستخدم'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: USER DETAILS VIEW */}
      {selectedUserForDetails && (
        <Modal
          id="user-details-modal"
          isOpen={!!selectedUserForDetails}
          onClose={() => setSelectedUserForDetails(null)}
          title="تفاصيل بيانات حساب المستخدم"
          subtitle={`المعرف الرقمي: #${selectedUserForDetails.id} | @${selectedUserForDetails.username}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{selectedUserForDetails.full_name}</h4>
                <p className="font-mono text-emerald-800 font-bold mt-0.5">@{selectedUserForDetails.username}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                selectedUserForDetails.is_active === 1
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {selectedUserForDetails.is_active === 1 ? 'الحساب نشط' : 'الحساب معطل'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 font-medium block">الدور الوظيفي:</span>
                <span className="font-bold text-slate-800 text-xs mt-0.5 inline-block">
                  {selectedUserForDetails.role_name_ar}
                </span>
                <span className="text-[10px] font-mono text-slate-500 block">({selectedUserForDetails.role_code})</span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 font-medium block">الفرع التابع له:</span>
                <span className="font-bold text-slate-800 text-xs mt-0.5 inline-block">
                  {selectedUserForDetails.branch_name || 'الفرع الرئيسي'}
                </span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 font-medium block">رقم الهاتف:</span>
                <span className="font-bold text-slate-800 text-xs mt-0.5 inline-block font-mono" dir="ltr">
                  {selectedUserForDetails.phone || 'غير مسجل'}
                </span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 font-medium block">البريد الإلكتروني:</span>
                <span className="font-bold text-slate-800 text-xs mt-0.5 inline-block font-mono truncate" dir="ltr">
                  {selectedUserForDetails.email || 'غير مسجل'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">تاريخ التسجيل بالمنظومة:</span>
              <span className="font-mono text-slate-700 font-bold text-[11px]">
                {selectedUserForDetails.created_at ? new Date(selectedUserForDetails.created_at).toLocaleString('ar-EG') : 'البيانات التأسيسية'}
              </span>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleToggleStatus(selectedUserForDetails)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedUserForDetails.is_active === 1
                    ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                {selectedUserForDetails.is_active === 1 ? 'تعطيل الحساب الآن' : 'تفعيل الحساب الآن'}
              </button>

              <button
                type="button"
                onClick={() => setSelectedUserForDetails(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
