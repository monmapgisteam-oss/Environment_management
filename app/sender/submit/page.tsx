import SubmitReportForm from "@/components/submit/SubmitReportForm";
import { requireUser } from "@/lib/auth";

export default async function SubmitReportPage(props: { searchParams: Promise<{ edit?: string; type?: string }> }) {
  await requireUser("sender");
  const { edit, type } = await props.searchParams;
  // A new key per edit id / type, so moving between "edit X" and "new plan"
  // starts a clean form instead of carrying the other one's fields and files.
  return <SubmitReportForm key={`${edit ?? ""}|${type ?? ""}`} />;
}
