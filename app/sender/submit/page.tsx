import SubmitReportForm from "@/components/submit/SubmitReportForm";
import { requireUser } from "@/lib/auth";

export default async function SubmitReportPage() {
  await requireUser("sender");
  return <SubmitReportForm />;
}
