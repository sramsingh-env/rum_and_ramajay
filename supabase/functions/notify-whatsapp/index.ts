import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const payload = await req.json();
  const record = payload.record;

  const phoneNumberId = Deno.env.get("META_PHONE_NUMBER_ID");
  const accessToken = Deno.env.get("META_ACCESS_TOKEN");
  const recipientNumber = Deno.env.get("RECIPIENT_WHATSAPP_NUMBER");

  const message = `📬 New Supabase record:\n${JSON.stringify(record, null, 2)}`;

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipientNumber,
        type: "text",
        text: { body: message },
      }),
    }
  );

  const result = await res.json();
  console.log(result);

  return new Response("OK", { status: 200 });
});
