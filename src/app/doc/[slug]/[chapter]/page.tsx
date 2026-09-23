import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReaderPanel, type ReaderUnlockInfo } from "@/components/reader-panel";
import type { ChapterListItem } from "@/components/view-contracts";
import { chapterTitle, sampleParagraphs } from "@/data/stories";
import { getDisplayAd } from "@/lib/display-ads";
import { getCatalogStory, getManagedChapterBody } from "@/lib/managed-stories";
import { getUnlockExpiration, resolveUnlock, UNLOCK_SECONDS } from "@/lib/unlock";

type Props = { params: Promise<{ slug: string; chapter: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug, chapter } = await params; const result = await getCatalogStory(slug); const number = Number(chapter); return { title: result ? `${result.managed?.chapters[number - 1]?.title ?? chapterTitle(number)} — ${result.story.title}` : "Không tìm thấy chương", robots: { index: false, follow: false } }; }

export default async function ChapterPage({ params }: Props) {
  const { slug, chapter: rawChapter } = await params;
  const result = await getCatalogStory(slug);
  const chapter = Number(rawChapter);
  if (!result || !Number.isInteger(chapter) || chapter < 1 || chapter > result.story.chapters) notFound();
  const { story, managed } = result;

  // Mode and grant are resolved on the server for every request; the client only receives the view-model.
  const [resolved, unlockExpiresAt] = await Promise.all([resolveUnlock(), getUnlockExpiration()]);
  const hasAccess = chapter <= story.freeChapters || unlockExpiresAt !== null;
  const content = !hasAccess
    ? null
    : managed
      ? await getManagedChapterBody(slug, chapter) ?? null
      : [...sampleParagraphs, ...sampleParagraphs].join("\n\n");

  const unlock: ReaderUnlockInfo = {
    mode: resolved.mode,
    destinationHost: resolved.mode === "link" ? resolved.destination.hostname : null,
    accessMinutes: UNLOCK_SECONDS / 60,
  };
  // Titles and lock state only — never bodies.
  const chapters: ChapterListItem[] = Array.from({ length: story.chapters }, (_, index) => {
    const number = index + 1;
    return { number, title: managed?.chapters[index]?.title ?? chapterTitle(number), href: `/doc/${story.slug}/${number}`, locked: number > story.freeChapters && unlockExpiresAt === null, current: number === chapter };
  });
  const readerEndAd = content !== null ? await getDisplayAd("reader_end") : null;

  return <ReaderPanel
    story={story}
    chapter={chapter}
    title={managed?.chapters[chapter - 1]?.title ?? chapterTitle(chapter)}
    content={content}
    unlock={unlock}
    unlockExpiresAt={unlockExpiresAt}
    navigation={{ prevHref: chapter > 1 ? `/doc/${story.slug}/${chapter - 1}` : null, nextHref: chapter < story.chapters ? `/doc/${story.slug}/${chapter + 1}` : null, chapters }}
    readerEndAd={readerEndAd}
  />;
}
