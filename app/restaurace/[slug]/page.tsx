import { redirect } from "next/navigation";

export default async function LegacyConceptRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/${slug}`);
}
