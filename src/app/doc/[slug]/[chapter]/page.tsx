import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReaderPanel } from "@/components/reader-panel";
import { chapterTitle, sampleParagraphs } from "@/data/stories";
import { getCatalogStory, getManagedChapterBody } from "@/lib/managed-stories";
import { getClickUnlockDestination, getClickUnlockExpiration } from "@/lib/click-unlock";

type Props = { params: Promise<{ slug: string; chapter: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug, chapter } = await params; const result = await getCatalogStory(slug); const number = Number(chapter); return { title: result ? `${result.managed?.chapters[number - 1]?.title ?? chapterTitle(number)} — ${result.story.title}` : "Không tìm thấy chương", robots: { index: false, follow: false } }; }

export default async function ChapterPage({ params }: Props) {
  const { slug, chapter: rawChapter } = await params;
  const result = await getCatalogStory(slug);
  const chapter = Number(rawChapter);
  if (!result || !Number.isInteger(chapter) || chapter < 1 || chapter > result.story.chapters) notFound();
  const { story, managed } = result;
  const unlockExpiresAt = await getClickUnlockExpiration();
  const hasAccess = chapter <= story.freeChapters || unlockExpiresAt !== null;
  const content = !hasAccess
    ? null
    : managed
      ? await getManagedChapterBody(slug, chapter) ?? null
      : [...sampleParagraphs, ...sampleParagraphs].join("\n\n");
  return <ReaderPanel story={story} chapter={chapter} title={managed?.chapters[chapter - 1]?.title ?? chapterTitle(chapter)} content={content} gateEnabled={Boolean(getClickUnlockDestination())} unlockExpiresAt={unlockExpiresAt} />;
}
