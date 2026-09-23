import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReaderPanel, type ReaderUnlockInfo } from "@/components/reader-panel";
import type { ChapterListItem } from "@/components/view-contracts";
import { chapterTitle, sampleParagraphs } from "@/data/stories";
import { getDisplayAd } from "@/lib/display-ads";
import { getCatalogStory, getManagedChapterBody } from "@/lib/managed-stories";
import { getUnlockExpiration, remainingUnlockMs, resolveUnlock, UNLOCK_SECONDS } from "@/lib/unlock";

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
  const hasAccess = chapter <= story.freeChapters || remainingUnlockMs(unlockExpiresAt) > 0;
  const content = !hasAccess
    ? null
    : managed
      ? await getManagedChapterBody(slug, chapter) ?? null
      : [...sampleParagraphs, ...sampleParagraphs].join("\n\n");
  const configuredAd = content !== null ? await getDisplayAd("reader_end") : null;
  // The grant may expire while the body or ad config is being fetched. Do not serialize it in that response.
  const grantRemainingMs = remainingUnlockMs(unlockExpiresAt);
  const grantStillValid = grantRemainingMs > 0;
  const safeContent = chapter <= story.freeChapters || grantStillValid ? content : null;

  const unlock: ReaderUnlockInfo = {
    mode: resolved.mode,
    destinationHost: resolved.mode === "link" ? resolved.destination.hostname : null,
    accessMinutes: UNLOCK_SECONDS / 60,
  };
  // Titles and lock state only — never bodies.
  const chapters: ChapterListItem[] = Array.from({ length: story.chapters }, (_, index) => {
    const number = index + 1;
    return { number, title: managed?.chapters[index]?.title ?? chapterTitle(number), href: `/doc/${story.slug}/${number}`, locked: number > story.freeChapters && !grantStillValid, current: number === chapter };
  });
  const readerEndAd = safeContent !== null ? configuredAd : null;

  // A new grant remounts the reader so locally expired content cannot reappear from stale state.
  return <ReaderPanel
    key={`${story.slug}/${chapter}/${unlockExpiresAt ?? "locked"}`}
    story={story}
    chapter={chapter}
    title={managed?.chapters[chapter - 1]?.title ?? chapterTitle(chapter)}
    content={safeContent}
    unlock={unlock}
    unlockExpiresAt={unlockExpiresAt}
    grantRemainingMs={grantStillValid ? grantRemainingMs : null}
    navigation={{ prevHref: chapter > 1 ? `/doc/${story.slug}/${chapter - 1}` : null, nextHref: chapter < story.chapters ? `/doc/${story.slug}/${chapter + 1}` : null, chapters }}
    readerEndAd={readerEndAd}
  />;
}
