import ConvertApp from "@/components/ConvertApp";

interface ToolPageProps {
  params: Promise<{
    kind: string;
  }>;
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { kind } = await params;

  return <ConvertApp initialKind={kind} showToolPanel />;
}
