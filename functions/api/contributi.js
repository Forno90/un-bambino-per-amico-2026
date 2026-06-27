/**
 * Cloudflare Pages Function — riceve il modulo "Invia info"
 * e invia una email a Paolo tramite Resend (con eventuali allegati).
 *
 * Variabile d'ambiente richiesta (impostata in Cloudflare):
 *   RESEND_API_KEY  -> la tua chiave API di Resend (https://resend.com)
 *
 * Endpoint: POST /api/contributi
 */

const DEST_EMAIL = "paolo.fornacciari@gmail.com";
const MITTENTE = "Portale Campo Estivo <onboarding@resend.dev>";
const MAX_TOTALE = 10 * 1024 * 1024; // 10 MB

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const form = await request.formData();

    // Trappola anti-spam: se il campo nascosto è compilato, è un bot.
    if ((form.get("_honey") || "").toString().trim() !== "") {
      return json({ success: true }); // fingiamo successo, ignoriamo
    }

    const nome = (form.get("nome") || "").toString().trim();
    const email = (form.get("email") || "").toString().trim();
    const tipo = (form.get("tipo") || "").toString().trim();
    const messaggio = (form.get("messaggio") || "").toString().trim();

    if (!nome || !tipo || !messaggio) {
      return json({ success: false, message: "Compila i campi obbligatori." }, 400);
    }

    if (!env.RESEND_API_KEY) {
      return json(
        { success: false, message: "Modulo non ancora configurato (RESEND_API_KEY mancante). Avvisa Paolo." },
        500
      );
    }

    // Allegati
    const attachments = [];
    let totale = 0;
    for (const file of form.getAll("attachment")) {
      if (typeof file === "string" || !file || file.size === 0) continue;
      totale += file.size;
      if (totale > MAX_TOTALE) {
        return json(
          { success: false, message: "Allegati troppo grandi (massimo 10 MB in totale)." },
          413
        );
      }
      const buf = await file.arrayBuffer();
      attachments.push({ filename: file.name, content: toBase64(buf) });
    }

    const html = `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#2b2b3a">
        <h2 style="color:#ec008c;margin:0 0 12px">📨 Nuovo contributo — Campo Estivo 2026</h2>
        <table style="border-collapse:collapse;font-size:14px">
          <tr><td style="padding:4px 12px 4px 0;color:#6b6b7b">Da</td><td><b>${esc(nome)}</b></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b6b7b">Email</td><td>${esc(email) || "—"}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b6b7b">Tipo</td><td>${esc(tipo)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b6b7b">Allegati</td><td>${attachments.length}</td></tr>
        </table>
        <h3 style="margin:18px 0 6px">Messaggio</h3>
        <div style="white-space:pre-wrap;background:#f5f6fa;border-radius:10px;padding:12px">${esc(messaggio)}</div>
      </div>`;

    const payload = {
      from: MITTENTE,
      to: [DEST_EMAIL],
      subject: `Nuovo contributo — ${tipo}`,
      html,
    };
    if (email) payload.reply_to = email;
    if (attachments.length) payload.attachments = attachments;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return json({ success: false, message: "Invio email non riuscito. Riprova.", detail }, 502);
    }

    return json({ success: true });
  } catch (err) {
    return json({ success: false, message: "Errore del server. Riprova." }, 500);
  }
}

// Risponde con un messaggio chiaro anche se qualcuno apre l'URL nel browser (GET)
export function onRequestGet() {
  return json({ success: false, message: "Usa il modulo del sito per inviare." }, 405);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toBase64(buf) {
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
