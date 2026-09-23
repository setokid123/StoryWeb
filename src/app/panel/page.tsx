import type { Metadata } from "next";
import { AdminLogin } from "@/components/admin-login";
import { PublishingPanel } from "@/components/publishing-panel";
import { adminConfigured } from "@/lib/admin-auth";
import { getCmsAccess } from "@/lib/cms-access";
import { readManagedStories } from "@/lib/managed-stories";

export const metadata: Metadata = { title: "Thư Các Studio", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PanelPage() {
  // Editors/admins with an account session, or the legacy ADMIN_PANEL_PASSWORD cookie.
  const access = await getCmsAccess();
  if (access.ok) return <PublishingPanel initialStories={await readManagedStories(access.actor)} />;
  if (access.status === 403) return <section className="panel-access"><div className="panel-access__card"><div className="eyebrow">THƯ CÁC STUDIO</div><h1>Chưa có <em>quyền đăng truyện</em></h1><p>Tài khoản đang đăng nhập là tài khoản độc giả. Liên hệ quản trị viên để được cấp quyền tác giả.</p></div></section>;
  if (!adminConfigured()) return <section className="panel-access"><div className="panel-access__card"><div className="eyebrow">THƯ CÁC STUDIO</div><h1>Thiết lập <em>panel đăng truyện</em></h1><p>Để kích hoạt panel, thêm <code>ADMIN_PANEL_PASSWORD</code> và <code>ADMIN_SESSION_SECRET</code> (ít nhất 32 ký tự) vào <code>.env.local</code>, sau đó khởi động lại server.</p></div></section>;
  return <AdminLogin />;
}
