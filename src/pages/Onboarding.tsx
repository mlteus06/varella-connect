import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loadConfigFromCloud, getSupabaseConfig } from "@/lib/supabase-client";
import { Loader2 } from "lucide-react";

export default function Onboarding() {
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      // Check localStorage first
      if (getSupabaseConfig()) {
        navigate("/dashboard");
        return;
      }
      // Try loading from Cloud
      const config = await loadConfigFromCloud();
      if (config) {
        navigate("/dashboard");
      } else {
        // No config found — shouldn't happen if signup was done correctly
        // Redirect to auth
        navigate("/auth");
      }
    };
    init();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
