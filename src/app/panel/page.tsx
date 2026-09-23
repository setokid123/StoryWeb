import type { Metadata } from "next";
import { AdminLogin } from "@/components/admin-login";
import { PublishingPanel } from "@/components/publishing-panel";
import { adminConfigured, hasAdminSession } from "@/lib/admin-auth";
import { readManagedStories } from "@/lib/managed-stories";

export const metadata: Metadata = { title: "Thư Các Studio", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PanelPage() {
  if (!adminConfigured()) return <section className="panel-access"><div className="panel-access__card"><div className="eyebrow">THƯ CÁC STUDIO</div><h1>Thiết lập <em>panel đăng truyện</em></h1><p>Để kích hoạt panel, thêm <code>ADMIN_PANEL_PASSWORD</code> và <code>ADMIN_SESSION_SECRET</code> (ít nhất 32 ký tự) vào <code>.env.local</code>, sau đó khởi động lại server.</p></div></section>;
  if (!await hasAdminSession()) return <AdminLogin />;
  return <PublishingPanel initialStories={await readManagedStories()} />;
}
