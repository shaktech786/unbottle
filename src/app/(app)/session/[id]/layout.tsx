import { SessionProvider } from "@/lib/session/context";

export default async function SessionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <SessionProvider sessionId={id}>{children}</SessionProvider>;
}
