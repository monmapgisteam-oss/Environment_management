import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function LegacyStaffQrPage(props: Props) {
  const params = await props.params;
  redirect(`/qr/profile/${params.id}`);
}
