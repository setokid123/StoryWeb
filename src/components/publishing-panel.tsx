"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, CircleHelp, FilePlus2, LayoutDashboard, LogOut, Plus, Save, Send, Settings2, Trash2 } from "lucide-react";
import type { ManagedStory, StoryInput } from "@/lib/managed-stories";

type EditorStory = StoryInput & { id?: string };

function blankStory(): EditorStory {
  return { title: "", slug: "", author: "", genre: "Đô thị", description: "", tags: [], visibility: "draft", completed: false, freeChapters: 1, chapters: [{ title: "", body: "" }] };
}

function slugify(value: string) {
  return value.toLocaleLowerCase("vi").replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** `canManageSettings` only shows the link; /panel/cai-dat and its API re-check admin access on the server. */
export function PublishingPanel({ initialStories, canManageSettings = false }: { initialStories: ManagedStory[]; canManageSettings?: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState(initialStories);
  const [selectedId, setSelectedId] = useState<string | null>(initialStories[0]?.id ?? null);
  const [editor, setEditor] = useState<EditorStory>(initialStories[0] ?? blankStory());
  const [savedVersion, setSavedVersion] = useState(JSON.stringify(initialStories[0] ?? blankStory()));
  const [activeChapter, setActiveChapter] = useState(0);
  const [busy, setBusy] = useState<"draft" | "published" | "delete" | "logout" | null>(null);
  const [message, setMessage] = useState("");
  const [apiError, setApiError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const isDirty = JSON.stringify(editor) !== savedVersion;
  const selectedChapter = editor.chapters[activeChapter];

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  function confirmDiscard() { return !isDirty || window.confirm("Bạn có thay đổi chưa lưu. Bỏ các thay đổi này?"); }
  function choose(story: ManagedStory) { if (busy || selectedId === story.id || !confirmDiscard()) return; setSelectedId(story.id); setEditor(story); setSavedVersion(JSON.stringify(story)); setActiveChapter(0); setMessage(""); setApiError(""); setFieldErrors({}); }
  function createNew() { if (busy || !confirmDiscard()) return; const fresh = blankStory(); setSelectedId(null); setEditor(fresh); setSavedVersion(JSON.stringify(fresh)); setActiveChapter(0); setMessage(""); setApiError(""); setFieldErrors({}); }
  function setField<K extends keyof EditorStory>(key: K, value: EditorStory[K]) { setEditor((current) => ({ ...current, [key]: value })); setMessage(""); setApiError(""); setFieldErrors((current) => { const next = { ...current }; delete next[key as string]; return next; }); }
  function setChapter(key: "title" | "body", value: string) { setEditor((current) => ({ ...current, chapters: current.chapters.map((chapter, index) => index === activeChapter ? { ...chapter, [key]: value } : chapter) })); setMessage(""); setApiError(""); setFieldErrors((currentErrs) => { const match = currentErrs.chapters?.match(/Chương (\d+)/); if (match && parseInt(match[1], 10) - 1 !== activeChapter) return currentErrs; const next = { ...currentErrs }; delete next.chapters; return next; }); }

  function validate(visibility: "draft" | "published"): Record<string, string> | null {
    const errs: Record<string, string> = {};
    if (!editor.title.trim()) errs.title = "Hãy nhập tên truyện trước khi lưu.";
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(editor.slug || slugify(editor.title))) errs.slug = "Đường dẫn truyện chỉ được dùng chữ thường, số và dấu gạch nối.";
    else if (editor.chapters.length > 500) errs.general = "Mỗi truyện tối đa 500 chương.";
    else if (editor.chapters.some((chapter) => chapter.body.length > 100000)) errs.chapters = "Nội dung mỗi chương tối đa 100.000 ký tự.";
    else if (visibility === "published") {
      if (!editor.author.trim()) errs.author = "Hãy nhập tên tác giả trước khi xuất bản.";
      else if (!editor.description.trim()) errs.description = "Hãy thêm mô tả truyện trước khi xuất bản.";
      else {
        const incomplete = editor.chapters.findIndex((chapter) => !chapter.title.trim() || !chapter.body.trim());
        if (incomplete >= 0) errs.chapters = `Chương ${incomplete + 1} cần có tiêu đề và nội dung trước khi xuất bản.`;
      }
    }
    return Object.keys(errs).length ? errs : null;
  }

  async function save(visibility: "draft" | "published") {
    if (busy) return;
    const validationErrors = validate(visibility);
    if (validationErrors) {
      setFieldErrors(validationErrors); setApiError(""); setMessage("");
      const firstField = Object.keys(validationErrors)[0];
      if (firstField === "title") document.getElementById("editor-title")?.focus();
      else if (firstField === "slug") document.getElementById("editor-slug")?.focus();
      else if (firstField === "author") document.getElementById("editor-author")?.focus();
      else if (firstField === "description") document.getElementById("editor-description")?.focus();
      else if (firstField === "chapters") {
        const incomplete = editor.chapters.findIndex((chapter) => !chapter.title.trim() || !chapter.body.trim());
        if (incomplete >= 0 && incomplete !== activeChapter) {
          setActiveChapter(incomplete);
          setTimeout(() => { const missing = !editor.chapters[incomplete].title.trim() ? "chapter-title" : "chapter-body"; document.getElementById(missing)?.focus(); }, 0);
        } else if (incomplete >= 0) {
          const missing = !editor.chapters[incomplete].title.trim() ? "chapter-title" : "chapter-body";
          document.getElementById(missing)?.focus();
        } else {
          document.getElementById("chapter-body")?.focus();
        }
      }
      return;
    }
    setFieldErrors({}); setApiError(""); setMessage("");
    setBusy(visibility);
    try {
      const payload = { ...editor, visibility, slug: editor.slug || slugify(editor.title), freeChapters: Math.min(editor.freeChapters, Math.max(1, editor.chapters.length)) };
      const response = await fetch("/api/admin/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) { setApiError(data.error ?? "Không thể lưu truyện."); return; }
      const saved: ManagedStory = data.story;
      setItems((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setSelectedId(saved.id); setEditor(saved); setSavedVersion(JSON.stringify(saved));
      setMessage(visibility === "published" ? "Truyện đã được xuất bản." : "Bản nháp đã được lưu.");
      router.refresh();
    } catch { setApiError("Không thể kết nối máy chủ. Nội dung vẫn còn trong trình soạn thảo; hãy thử lưu lại."); }
    finally { setBusy(null); }
  }

  async function remove() {
    if (!editor.id || busy || !window.confirm(`Xóa truyện “${editor.title}” và toàn bộ chương? Hành động này không thể hoàn tác.`)) return;
    setBusy("delete"); setApiError(""); setFieldErrors({}); setMessage("");
    try {
      const response = await fetch("/api/admin/stories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editor.id }) });
      const data = await response.json();
      if (!response.ok) { setApiError(data.error ?? "Không thể xóa truyện."); return; }
      const next = items.filter((item) => item.id !== editor.id);
      const nextEditor = next[0] ?? blankStory();
      setItems(next); setSelectedId(next[0]?.id ?? null); setEditor(nextEditor); setSavedVersion(JSON.stringify(nextEditor)); setActiveChapter(0);
      setMessage("Đã xóa truyện.");
      router.refresh();
    } catch { setApiError("Không thể kết nối máy chủ. Hãy thử xóa lại."); }
    finally { setBusy(null); }
  }

  async function logout() {
    if (busy || !confirmDiscard()) return;
    setBusy("logout"); setApiError(""); setFieldErrors({});
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) { setApiError("Không thể đăng xuất. Hãy thử lại."); return; }
      router.refresh();
    } catch { setApiError("Không thể kết nối máy chủ. Hãy thử đăng xuất lại."); }
    finally { setBusy(null); }
  }

  const publishedCount = items.filter((item) => item.visibility === "published").length;
  const chapterCount = items.reduce((total, item) => total + item.chapters.length, 0);

  return <div className="studio"><aside className="studio-sidebar" aria-label="Điều hướng Studio"><div className="studio-sidebar__brand"><span><BookOpen size={20} /></span><div><strong>THƯ CÁC</strong><small>STUDIO</small></div></div><div className="studio-sidebar__label">WORKSPACE</div><a className="studio-sidebar__link is-active" href="#studio-library"><LayoutDashboard size={18} /> Tổng quan</a><button className="studio-sidebar__link" type="button" disabled={busy !== null} onClick={createNew}><FilePlus2 size={18} /> Đăng truyện mới</button>{canManageSettings && <Link className="studio-sidebar__link" href="/panel/cai-dat"><Settings2 size={18} /> Quảng cáo &amp; mở khóa</Link>}<div className="studio-sidebar__spacer" /><div className="studio-sidebar__notice"><CircleHelp size={18} /><p>Chương 1 miễn phí mặc định. Quyền mở khóa các chương sau được kiểm tra trên máy chủ.</p></div><button className="studio-sidebar__link" type="button" disabled={busy !== null} onClick={logout}><LogOut size={18} /> {busy === "logout" ? "Đang đăng xuất..." : "Đăng xuất"}</button></aside>
    <div className="studio-main"><div className="studio-topbar"><div><span className="eyebrow">KHÔNG GIAN SÁNG TÁC</span><h1>Quản lý <em>truyện & chương</em></h1></div><button type="button" className="button button--primary" disabled={busy !== null} onClick={createNew}><Plus size={17} /> Tạo truyện mới</button></div>
      <div className="studio-stats"><div><span>Tổng số truyện</span><strong>{String(items.length).padStart(2, "0")}</strong></div><div><span>Đã xuất bản</span><strong>{String(publishedCount).padStart(2, "0")}</strong></div><div><span>Tổng số chương</span><strong>{String(chapterCount).padStart(2, "0")}</strong></div></div>
      <div className="studio-workspace"><section className="studio-library" id="studio-library" aria-label="Danh sách truyện"><div className="studio-section-title"><h2>Thư viện của bạn</h2><span>{items.length} truyện</span></div>{items.length === 0 ? <p className="studio-library__empty">Chưa có truyện nào. Bắt đầu với bản thảo đầu tiên.</p> : <div className="studio-library__list">{items.map((item) => <button type="button" key={item.id} className={`studio-library__item ${selectedId === item.id ? "is-selected" : ""}`} aria-current={selectedId === item.id ? "true" : undefined} disabled={busy !== null} onClick={() => choose(item)}><span className="studio-library__initial" aria-hidden="true">{item.title.slice(0, 1)}</span><span><strong>{item.title}</strong><small>{item.chapters.length} chương · {item.visibility === "published" ? "Đã đăng" : "Bản nháp"}</small></span><ArrowRight size={16} aria-hidden="true" /></button>)}</div>}</section>
      <section className="studio-editor" aria-label="Trình soạn thảo truyện"><div className="studio-section-title"><div><span className="eyebrow">{selectedId ? "CHỈNH SỬA TÁC PHẨM" : "BẢN THẢO MỚI"}</span><h2>{editor.title || "Truyện chưa có tên"}</h2></div><div className="studio-editor__state">{isDirty && <span className="studio-unsaved">Chưa lưu</span>}<span className={`studio-status ${editor.visibility === "published" ? "studio-status--published" : ""}`}>{editor.visibility === "published" ? "Đã đăng" : "Bản nháp"}</span></div></div>
        <div className="studio-form-grid"><div className="studio-field"><label htmlFor="editor-title">Tên truyện <span aria-hidden="true">*</span></label><input id="editor-title" value={editor.title} maxLength={255} aria-required="true" aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? "error-title" : undefined} onChange={(event) => { const title = event.target.value; setEditor((current) => ({ ...current, title, slug: current.id ? current.slug : slugify(title) })); setMessage(""); setApiError(""); setFieldErrors((current) => { const next = { ...current }; delete next.title; delete next.slug; return next; }); }} placeholder="Nhập tên tác phẩm" />{fieldErrors.title && <span id="error-title" className="form-error-inline" role="alert">{fieldErrors.title}</span>}</div><div className="studio-field"><label htmlFor="editor-slug">Đường dẫn <span aria-hidden="true">*</span></label><input id="editor-slug" value={editor.slug} maxLength={180} aria-required="true" aria-invalid={Boolean(fieldErrors.slug)} aria-describedby={fieldErrors.slug ? "error-slug" : undefined} onChange={(event) => setField("slug", slugify(event.target.value))} placeholder="ten-truyen" /><small className="studio-field-hint">Dùng trong địa chỉ trang truyện.</small>{fieldErrors.slug && <span id="error-slug" className="form-error-inline" role="alert">{fieldErrors.slug}</span>}</div><div className="studio-field"><label htmlFor="editor-author">Tác giả <span className="studio-optional">(cần khi xuất bản)</span></label><input id="editor-author" value={editor.author} maxLength={160} aria-invalid={Boolean(fieldErrors.author)} aria-describedby={fieldErrors.author ? "error-author" : undefined} onChange={(event) => setField("author", event.target.value)} placeholder="Bút danh" />{fieldErrors.author && <span id="error-author" className="form-error-inline" role="alert">{fieldErrors.author}</span>}</div><div className="studio-field"><label htmlFor="editor-genre">Thể loại</label><select id="editor-genre" value={editor.genre} onChange={(event) => setField("genre", event.target.value)}>{["Đô thị", "Tình cảm", "Cổ đại", "Kỳ ảo", "Đời thường", "Khác"].map((genre) => <option key={genre}>{genre}</option>)}</select></div><div className="studio-form-grid__wide studio-field"><label htmlFor="editor-description">Mô tả truyện <span className="studio-optional">(cần khi xuất bản)</span></label><textarea id="editor-description" rows={3} maxLength={5000} aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? "error-description" : undefined} value={editor.description} onChange={(event) => setField("description", event.target.value)} placeholder="Một lời giới thiệu đủ khiến độc giả muốn đọc tiếp..." />{fieldErrors.description && <span id="error-description" className="form-error-inline" role="alert">{fieldErrors.description}</span>}</div><div className="studio-form-grid__wide studio-field"><label htmlFor="editor-tags">Thẻ phân loại <span className="studio-optional">(ngăn cách bằng dấu phẩy, tối đa 8 thẻ)</span></label><input id="editor-tags" value={editor.tags.join(", ")} onChange={(event) => setField("tags", event.target.value.split(",").slice(0, 8))} placeholder="Chữa lành, Hiện đại, Tình cảm" /></div></div>
        <div className="studio-section-divider"><div><Settings2 size={18} /><strong>Thiết lập chương</strong></div><span>Chương đầu miễn phí mặc định</span></div><div className="studio-settings"><label htmlFor="editor-free">Số chương miễn phí <input id="editor-free" type="number" min={1} max={Math.max(1, editor.chapters.length)} value={editor.freeChapters} onChange={(event) => setField("freeChapters", Math.min(Math.max(1, Number(event.target.value) || 1), Math.max(1, editor.chapters.length)))} /></label><label className="studio-check"><input type="checkbox" checked={editor.completed} onChange={(event) => setField("completed", event.target.checked)} /> Đánh dấu truyện hoàn thành</label></div>
        <div className="studio-section-divider"><div><BookOpen size={18} /><strong>Nội dung chương</strong></div><button type="button" disabled={busy !== null || editor.chapters.length >= 500} onClick={() => { setEditor((current) => ({ ...current, chapters: [...current.chapters, { title: "", body: "" }] })); setActiveChapter(editor.chapters.length); setMessage(""); }}><Plus size={15} /> Thêm chương</button></div><div className="chapter-editor"><div className="chapter-editor__list" aria-label="Danh sách chương">{editor.chapters.map((chapter, index) => <button type="button" key={index} className={index === activeChapter ? "is-selected" : ""} aria-current={index === activeChapter ? "true" : undefined} onClick={() => setActiveChapter(index)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{chapter.title || `Chương ${index + 1}`}</strong>{index < editor.freeChapters && <small>MIỄN PHÍ</small>}</button>)}</div><div className="chapter-editor__form"><span className="eyebrow">CHƯƠNG {activeChapter + 1}</span><div className="studio-field"><label htmlFor="chapter-title">Tiêu đề chương</label><input id="chapter-title" value={selectedChapter?.title ?? ""} maxLength={255} aria-invalid={Boolean(fieldErrors.chapters)} aria-describedby={fieldErrors.chapters ? "error-chapters" : undefined} onChange={(event) => setChapter("title", event.target.value)} placeholder="Tiêu đề chương" /></div><div className="studio-field"><label htmlFor="chapter-body">Nội dung</label><textarea id="chapter-body" rows={12} value={selectedChapter?.body ?? ""} maxLength={100000} aria-invalid={Boolean(fieldErrors.chapters)} aria-describedby={fieldErrors.chapters ? "error-chapters" : undefined} onChange={(event) => setChapter("body", event.target.value)} placeholder="Bắt đầu câu chuyện của bạn tại đây..." /></div>{fieldErrors.chapters && <span id="error-chapters" className="form-error-inline" role="alert">{fieldErrors.chapters}</span>}<div className="chapter-editor__footer"><span>{(selectedChapter?.body ?? "").trim().split(/\s+/).filter(Boolean).length} từ · {(selectedChapter?.body ?? "").length.toLocaleString("vi-VN")}/100.000 ký tự</span>{editor.chapters.length > 1 && activeChapter === editor.chapters.length - 1 && <button type="button" disabled={busy !== null} onClick={() => { if (!window.confirm("Xóa chương cuối khỏi bản thảo đang soạn?")) return; setEditor((current) => ({ ...current, chapters: current.chapters.slice(0, -1), freeChapters: Math.min(current.freeChapters, current.chapters.length - 1) })); setActiveChapter(Math.max(0, activeChapter - 1)); setMessage(""); }}><Trash2 size={14} /> Xóa chương cuối</button>}</div></div></div>
        <div className="studio-feedback" aria-live="polite">{apiError && <p className="form-error" role="alert">{apiError}</p>}{fieldErrors.general && <p className="form-error" role="alert">{fieldErrors.general}</p>}{message && <p className="form-success" role="status"><Check size={16} /> {message}</p>}{busy && <p className="studio-saving" role="status">Đang xử lý, vui lòng chờ...</p>}</div>
        <div className="studio-actions"><button type="button" className="button button--outline" disabled={busy !== null} onClick={() => save("draft")}><Save size={17} /> {busy === "draft" ? "Đang lưu..." : "Lưu bản nháp"}</button><button type="button" className="button button--primary" disabled={busy !== null} onClick={() => save("published")}><Send size={17} /> {busy === "published" ? "Đang xuất bản..." : "Xuất bản truyện"}</button>{editor.id && editor.visibility === "published" && <Link href={`/truyen/${editor.slug}`} target="_blank" rel="noopener noreferrer">Xem trang truyện <ArrowRight size={16} /></Link>}{editor.id && <button type="button" className="studio-delete" disabled={busy !== null} onClick={remove}><Trash2 size={16} /> {busy === "delete" ? "Đang xóa..." : "Xóa truyện"}</button>}</div>
      </section></div>
    </div>
  </div>;
}
