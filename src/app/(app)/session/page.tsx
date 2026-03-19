import { redirect } from "next/navigation";

// /session redirects to dashboard — session list is on the dashboard
export default function SessionsPage() {
  redirect("/dashboard");
}
