import { Request, Response } from "express";
import Whatsapp from "../models/Whatsapp";
import ProcessMetaMessageService from "../services/WbotServices/ProcessMetaMessageService";

export const verification = async (req: Request, res: Response): Promise<Response> => {
    const mode = req.query["hub.mode"] as string;
    const token = req.query["hub.verify_token"] as string;
    const challenge = req.query["hub.challenge"] as string;

    // Find if any connection matches this verify token
    // Since we might have multiple connections, we need to find WHICH one this is for, 
    // OR we use a global verify token. For multi-tenant/multi-connection, it's tricky.
    // Best approach: User sets the same verify token in Meta App as in their Connection settings, 
    // or we use the 'token' param effectively.

    // For simplicity, we check if ANY channel has this verify token.
    const channel = await Whatsapp.findOne({ where: { verifyToken: token } });

    if (mode === "subscribe" && channel) {
        return res.status(200).send(challenge);
    }

    return res.status(403).json({ error: "Verification failed" });
};

export const index = async (req: Request, res: Response): Promise<Response> => {
    try {
        const body = req.body;

        if (body.object === "page" || body.object === "instagram") {
            // Iterate over each entry - there may be multiple if batched
            for (const entry of body.entry) {
                // Gets the body of the webhook event
                const webhook_event = entry.messaging[0];

                // Get the sender PSID
                const sender_psid = webhook_event.sender.id;

                // Find which channel this event belongs to.
                // Usually 'entry.id' matches the Page ID.
                // We need to match this PageID to our stored Channel token or ID?
                // Limitation: We don't store PageID in 'Whatsapp' model yet. 
                // We will assume for now we find the first channel of type 'facebook' or 'instagram'.
                // TODO: Store PageID in 'Whatsapp' model to allow multiple facebook pages.

                let channel = await Whatsapp.findOne({ where: { channel: body.object === "page" ? "facebook" : "instagram" } });

                if (channel && webhook_event.message) {
                    const referral = webhook_event.referral || webhook_event.message?.referral || webhook_event.postback?.referral;
                    let adReply: string | null = null;
                    if (referral) {
                        const adsContext = referral.ads_context_data || {};
                        const title = referral.ad_title || adsContext.ad_title || "";
                        const body = referral.ref || "";
                        const sourceUrl = referral.source_url || "";
                        const sourceId = referral.ad_id || "";
                        const thumbnailUrl = referral.image_url || adsContext.photo_url || referral.video_url || adsContext.video_url || "";
                        if (title || thumbnailUrl || sourceUrl) {
                            adReply = JSON.stringify({
                                title,
                                body,
                                sourceUrl,
                                sourceId,
                                sourceType: "ad",
                                thumbnailUrl
                            });
                        }
                    }

                    await ProcessMetaMessageService(channel.id, {
                        senderId: sender_psid,
                        recipientId: webhook_event.recipient.id,
                        text: webhook_event.message.text || "(Media/Attachment)",
                        timestamp: webhook_event.timestamp,
                        messageId: webhook_event.message.mid,
                        adReply
                    });
                }
            }

            return res.status(200).send("EVENT_RECEIVED");
        }

        return res.sendStatus(404);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal Error" });
    }
};
