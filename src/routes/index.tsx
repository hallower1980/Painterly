import { createFileRoute } from "@tanstack/react-router";
import { PainterlyApp } from "@/components/painterly/PainterlyApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <PainterlyApp />;
}
