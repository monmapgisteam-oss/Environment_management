import SubmitReportForm from "@/components/submit/SubmitReportForm";
import { requireUser } from "@/lib/auth";

export default async function SubmitReportPage() {
  const user = await requireUser("sender");
  return <SubmitReportForm register={user.company?.registerNumber ?? ""} />;
}
