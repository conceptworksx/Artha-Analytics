import HistoryDashboardClient from "./HistoryDashboardClient";

interface PageProps {
  params: Promise<{ analysis_id: string }>;
}

export default async function HistoryPage({ params }: PageProps) {
  const resolvedParams = await params;
  return <HistoryDashboardClient analysisId={resolvedParams.analysis_id} />;
}
