import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UnlockSettingsContainer } from "@/components/unlock-settings-container";
import { buildAdminSettingsPayload } from "@/lib/admin-settings";
import { getAdminAccess } from "@/lib/cms-access";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = { title: "Quảng cáo & mở khóa — Thư Các Studio", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Admin only (legacy panel password or admin account). Editors/readers get 403 content; anonymous → /panel login. */
export default async function UnlockSettingsPage() {
  const access = await getAdminAccess();
  if (!access.ok && access.status === 401) redirect("/panel");
  if (!access.ok) return <section className="panel-access"><div className="panel-access__card"><div className="eyebrow">THƯ CÁC STUDIO</div><h1>Không có <em>quyền truy cập</em></h1><p>Chỉ quản trị viên được xem và sửa cài đặt quảng cáo &amp; mở khóa.</p></div></section>;
  const settings = await getSiteSettings();
  if (settings.unavailable) return <section className="panel-access"><div className="panel-access__card"><div className="eyebrow">THƯ CÁC STUDIO</div><h1>Chưa đọc được <em>cài đặt</em></h1><p>Không kết nối được bảng cấu hình. Kiểm tra cơ sở dữ liệu và migration <code>0003</code>.</p></div></section>;
  return <UnlockSettingsContainer initial={await buildAdminSettingsPayload()} />;
}
