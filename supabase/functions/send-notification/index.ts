import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  type: "order_update" | "promo" | "admin_alert";
  user_id?: string; // specific user, or null for broadcast
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");
    if (!FCM_SERVER_KEY) {
      throw new Error("FCM_SERVER_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();
    const { type, user_id, title, body, data } = payload;

    if (!title || !body) {
      return new Response(JSON.stringify({ error: "title and body are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get device tokens
    let tokenQuery = supabase.from("device_tokens").select("token, user_id");
    
    if (type === "admin_alert") {
      // Send to all admin users
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      
      const adminIds = (adminRoles || []).map((r) => r.user_id);
      if (adminIds.length === 0) {
        return new Response(JSON.stringify({ sent: 0, message: "No admins found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      tokenQuery = tokenQuery.in("user_id", adminIds);
    } else if (user_id) {
      // Send to specific user
      tokenQuery = tokenQuery.eq("user_id", user_id);
    }
    // If no user_id and not admin_alert, send to all (promo broadcast)

    const { data: tokens, error: tokenError } = await tokenQuery;
    if (tokenError) throw tokenError;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No device tokens found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via FCM (legacy HTTP API — simple and reliable)
    let sent = 0;
    const failed: string[] = [];

    for (const { token } of tokens) {
      const fcmRes = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: `key=${FCM_SERVER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: token,
          notification: { title, body, sound: "default" },
          data: { ...data, type },
        }),
      });

      if (fcmRes.ok) {
        sent++;
      } else {
        const errText = await fcmRes.text();
        console.error(`FCM send failed for token ${token.slice(0, 10)}...: ${errText}`);
        failed.push(token);
      }
    }

    // Remove invalid tokens
    if (failed.length > 0) {
      await supabase.from("device_tokens").delete().in("token", failed);
    }

    // Log notification
    await supabase.from("notifications").insert({
      user_id: user_id || null,
      title,
      body,
      data: data || {},
      type,
    });

    return new Response(JSON.stringify({ sent, failed: failed.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Notification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
