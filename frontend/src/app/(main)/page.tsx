export const dynamic = "force-dynamic";

import { HeroBanner } from "@/components/home/HeroBanner";
import { LatestUpdatesSection } from "@/components/home/LatestUpdatesSection";
import { TopThisWeekSection } from "@/components/home/TopThisWeekSection";
import { GenreTabsSection } from "@/components/home/GenreTabsSection";
import { ContinueReadingSection } from "@/components/home/ContinueReadingSection";
import { getManhwas, getTodayManhwas } from "@/lib/api/manhwa";
import { getGenres } from "@/lib/api/genre";

export default async function HomePage() {
  const [latestUpdates, heroCandidates, topThisWeek, newlyAdded, todayReleases, genres] = await Promise.all([
    getManhwas({ ordering: "-last_upload_time" }),
    getManhwas({ ordering: "-avg_rating" }),
    getManhwas({ ordering: "-views_count" }),
    getManhwas({ ordering: "-datetime_created" }),
    getTodayManhwas(),
    getGenres(),
  ]);
  return (
    <main className="min-h-screen bg-bg">
      <HeroBanner items={heroCandidates.results.slice(0, 5)} />
      {todayReleases.length > 0 && (
        <LatestUpdatesSection items={todayReleases.slice(0, 10)} title="پخش امروز" />
      )}
      <ContinueReadingSection />
      <LatestUpdatesSection items={latestUpdates.results} />
      <TopThisWeekSection items={topThisWeek.results.slice(0, 5)} />
      <LatestUpdatesSection items={newlyAdded.results} title="تازه اضافه‌شده‌ها" />
      <GenreTabsSection genres={genres} />
    </main>
  );
}