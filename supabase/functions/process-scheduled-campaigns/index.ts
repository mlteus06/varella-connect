import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all user configs (each user has their own external Supabase)
    const { data: configs, error: configError } = await supabase
      .from("user_configs")
      .select("user_id, supabase_url, supabase_api_key");

    if (configError || !configs || configs.length === 0) {
      return new Response(JSON.stringify({ message: "No configs found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalProcessed = 0;

    for (const config of configs) {
      const extClient = createClient(config.supabase_url, config.supabase_api_key);

      // Find campaigns that are scheduled and due
      const { data: dueCampaigns, error: campError } = await extClient
        .from("campaigns")
        .select("id, template_id, scheduled_at")
        .eq("status", "agendado")
        .lte("scheduled_at", new Date().toISOString());

      if (campError || !dueCampaigns || dueCampaigns.length === 0) continue;

      for (const campaign of dueCampaigns) {
        // Get template content
        let messageContent = "Olá";
        if (campaign.template_id) {
          const { data: template } = await extClient
            .from("message_templates")
            .select("content")
            .eq("id", campaign.template_id)
            .single();
          if (template) messageContent = template.content;
        }

        // Get campaign contacts
        const { data: contacts } = await extClient
          .from("campaign_contacts")
          .select("nome, telefone")
          .eq("campaign_id", campaign.id);

        if (contacts && contacts.length > 0) {
          // Insert into disparos in batches
          const batchSize = 500;
          for (let i = 0; i < contacts.length; i += batchSize) {
            const batch = contacts.slice(i, i + batchSize).map((c: any) => ({
              campaign_id: campaign.id,
              nome: c.nome,
              telefone: c.telefone,
              mensagem: messageContent,
              status: "PENDENTE",
            }));
            await extClient.from("disparos").insert(batch);
          }
        }

        // Update campaign status to pendente (ready for sending)
        await extClient
          .from("campaigns")
          .update({ status: "pendente" })
          .eq("id", campaign.id);

        totalProcessed++;
      }
    }

    return new Response(
      JSON.stringify({ message: `Processed ${totalProcessed} scheduled campaign(s)` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
