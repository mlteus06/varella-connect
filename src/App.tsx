import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthGuard } from "@/components/AuthGuard";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import Segmentation from "./pages/Segmentation";
import Templates from "./pages/Templates";
import Campaigns from "./pages/Campaigns";
import CampaignDashboard from "./pages/CampaignDashboard";
<<<<<<< HEAD
import Integrations from "./pages/Integrations";
import ExactSpotterFunnels from "./pages/ExactSpotterFunnels";
import ExactSpotterStages from "./pages/ExactSpotterStages";
=======
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<AuthGuard><Onboarding /></AuthGuard>} />
          <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
          <Route path="/contatos" element={<AuthGuard><Contacts /></AuthGuard>} />
          <Route path="/segmentacao" element={<AuthGuard><Segmentation /></AuthGuard>} />
<<<<<<< HEAD
          <Route path="/segmentacao/exact-spotter" element={<AuthGuard><ExactSpotterFunnels /></AuthGuard>} />
          <Route path="/segmentacao/exact-spotter/:funnelId/etapas" element={<AuthGuard><ExactSpotterStages /></AuthGuard>} />
          <Route path="/templates" element={<AuthGuard><Templates /></AuthGuard>} />
          <Route path="/campanhas" element={<AuthGuard><Campaigns /></AuthGuard>} />
          <Route path="/campanha/:id" element={<AuthGuard><CampaignDashboard /></AuthGuard>} />
          <Route path="/integracoes" element={<AuthGuard><Integrations /></AuthGuard>} />
=======
          <Route path="/templates" element={<AuthGuard><Templates /></AuthGuard>} />
          <Route path="/campanhas" element={<AuthGuard><Campaigns /></AuthGuard>} />
          <Route path="/campanha/:id" element={<AuthGuard><CampaignDashboard /></AuthGuard>} />
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
