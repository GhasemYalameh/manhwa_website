import { notFound } from "next/navigation";
import { getManhwaBySlug } from "@/lib/api/manhwa";
import { ManhwaHeader } from "@/components/manga/ManhwaHeader";
import { EpisodeList } from "@/components/manga/EpisodeList";
import { CommentList } from "@/components/manga/CommentList";
import { ApiError } from "@/lib/api/client";
import { ViewTracker } from "@/components/manga/ViewTracker";

interface ManhwaDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ highlightComment?: string }>;
}

export default async function ManhwaDetailPage({ params, searchParams }: ManhwaDetailPageProps) {
  const { slug } = await params;
  const { highlightComment } = await searchParams;

  let detail;
  try {
    detail = await getManhwaBySlug(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  return (
    <main className="min-h-screen bg-bg pb-12">
      <ViewTracker slug={slug} />
      <ManhwaHeader slug={slug} detail={detail} />
      <EpisodeList manhwaSlug={slug} />
      <CommentList
        manhwaSlug={slug}
        highlightCommentId={highlightComment ? Number(highlightComment) : undefined}
      />
    </main>
  );
}