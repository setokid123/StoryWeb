"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, ArrowRight } from "lucide-react";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? "Không thể đăng nhập."); return; }
      setPassword("");
      router.refresh();
    } catch { setError("Không thể kết nối máy chủ. Hãy thử lại."); }
    finally { setBusy(false); }
  }

  return <section className="panel-access"><div className="panel-access__card"><span className="panel-access__icon"><LockKeyhole size={24} /></span><div className="eyebrow">DÀNH CHO NGƯỜI QUẢN LÝ</div><h1>Đăng nhập <em>Thư Các Studio</em></h1><p>Quản lý truyện, soạn chương và xuất bản từ một nơi.</p><form onSubmit={submit} aria-busy={busy}><label htmlFor="admin-password">Mật khẩu quản trị</label><input id="admin-password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} autoComplete="current-password" aria-invalid={Boolean(error)} aria-describedby={error ? "admin-login-error" : undefined} required disabled={busy} /><button type="submit" className="button button--primary" disabled={busy}>{busy ? "Đang đăng nhập..." : "Vào Studio"}<ArrowRight size={17} /></button>{error && <span id="admin-login-error" className="form-error" role="alert">{error}</span>}</form></div></section>;
}
