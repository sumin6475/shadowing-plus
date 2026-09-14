import AppHome from "./app/page";
import PublicLanding from "@/components/landing/PublicLanding";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// `/` is the single front door: visitors see the product introduction while
// authenticated users go straight to their working app without another click.
export default async function RootPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? <AppHome /> : <PublicLanding />;
}
