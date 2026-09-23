import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { ManagedStoryError, readManagedStories, removeManagedStory, saveManagedStory, type StoryInput } from "@/lib/managed-stories";

export const runtime = "nodejs";

function storageError(error: unknown) {
  if (error instanceof ManagedStoryError) return NextResponse.json({ error: error.message }, { status: 400 });
  console.error("Story storage request failed", error);
  return NextResponse.json({ error: "Không thể truy cập dữ liệu truyện. Vui lòng thử lại sau." }, { status: 503 });
}

function parseInput(value: unknown): StoryInput | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const fields = ["slug", "title", "author", "genre", "description"] as const;
  if (fields.some((field) => typeof item[field] !== "string")) return null;
  const slug = (item.slug as string).trim();
  const title = (item.title as string).trim();
  const author = (item.author as string).trim();
  const genre = (item.genre as string).trim();
  const description = (item.description as string).trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 180 || !title || title.length > 255 || author.length > 160 || !genre || genre.length > 100 || description.length > 5000) return null;
  if (item.visibility !== "draft" && item.visibility !== "published") return null;
  if (typeof item.completed !== "boolean" || !Array.isArray(item.tags) || !Array.isArray(item.chapters)) return null;
  const tags = item.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0 && tag.length <= 50).map((tag) => tag.trim()).slice(0, 8);
  const chapters = item.chapters.map((chapter) => {
    if (!chapter || typeof chapter !== "object") return null;
    const row = chapter as Record<string, unknown>;
    if (typeof row.title !== "string" || typeof row.body !== "string") return null;
    return { title: row.title.trim(), body: row.body.trim() };
  });
  if (chapters.length > 500 || chapters.some((chapter) => !chapter || chapter.title.length > 255 || chapter.body.length > 100000)) return null;
  if (item.visibility === "published" && (!author || !description || chapters.length === 0 || chapters.some((chapter) => !chapter?.title || !chapter.body))) return null;
  const freeChapters = Number(item.freeChapters);
  if (!Number.isInteger(freeChapters) || freeChapters < 1 || freeChapters > Math.max(1, chapters.length)) return null;
  return { id: typeof item.id === "string" ? item.id : undefined, slug, title, author, genre, description, visibility: item.visibility, completed: item.completed, tags, chapters: chapters as { title: string; body: string }[], freeChapters };
}

export async function GET() {
  if (!await hasAdminSession()) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  try { return NextResponse.json({ stories: await readManagedStories() }); }
  catch (error) { return storageError(error); }
}

export async function POST(request: Request) {
  if (!await hasAdminSession()) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  const input = parseInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Dữ liệu truyện không hợp lệ. Cần ít nhất một chương để xuất bản; mặc định chương 1 miễn phí." }, { status: 400 });
  try { return NextResponse.json({ story: await saveManagedStory(input) }); }
  catch (error) { return storageError(error); }
}

export async function DELETE(request: Request) {
  if (!await hasAdminSession()) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const id = typeof body === "object" && body !== null && "id" in body ? body.id : undefined;
  if (typeof id !== "string") return NextResponse.json({ error: "Thiếu ID truyện." }, { status: 400 });
  try { await removeManagedStory(id); return NextResponse.json({ ok: true }); }
  catch (error) {
    if (error instanceof ManagedStoryError && error.message === "ID truyện không hợp lệ.") {
      console.error("Invalid story delete ID", { id: JSON.stringify(id), length: id.length });
    }
    return storageError(error);
  }
}
