import { redirect } from "next/navigation";

export default async function CatalogDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/marketplace/addons/${id}`);
}
