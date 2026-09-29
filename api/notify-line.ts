import type { IncomingMessage, ServerResponse } from 'http';

interface RequestBody {
  request?: any;
  config?: {
    channelAccessToken?: string;
    targetId?: string;
  };
}

export default async function handler(req: any, res: any) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body: RequestBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const sosData = body?.request;
    const channelAccessToken =
      body?.config?.channelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || process.env.VITE_LINE_CHANNEL_ACCESS_TOKEN;
    const targetId =
      body?.config?.targetId || process.env.LINE_TARGET_ID || process.env.VITE_LINE_TARGET_ID;

    if (!sosData) {
      return res.status(400).json({ error: 'Missing SOS request data' });
    }

    if (!channelAccessToken) {
      return res.status(200).json({
        success: false,
        message: 'ยังไม่ได้ระบุ LINE Channel Access Token ในการตั้งค่า (จำลองการส่งเรียบร้อย)',
      });
    }

    // Build LINE Flex message payload
    const urgency = sosData.urgency || 'NORMAL';
    const headerColor = urgency === 'CRITICAL' ? '#DC2626' : urgency === 'URGENT' ? '#EA580C' : '#0284C7';
    const mapsUrl = `https://www.google.com/maps?q=${sosData.coordinates?.lat || 0},${sosData.coordinates?.lng || 0}`;
    const cleanLineId = sosData.lineId ? sosData.lineId.replace(/^@/, '').trim() : '';

    const flexContents = {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: headerColor,
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: '🚨 แจ้งกู้ภัยด่วนน้ำท่วม (น้ำใจไทย)',
            weight: 'bold',
            color: '#FFFFFF',
            size: 'md',
          },
          {
            type: 'text',
            text: `รหัสเคส: #${sosData.id} (${urgency})`,
            weight: 'bold',
            color: '#FFFFFFCC',
            size: 'xs',
            margin: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: `👤 ผู้แจ้ง: ${sosData.fullName}`,
            weight: 'bold',
            size: 'sm',
            color: '#1E293B',
          },
          {
            type: 'text',
            text: `📍 ที่อยู่: ${sosData.address} อ.${sosData.district} จ.${sosData.province}`,
            size: 'xs',
            color: '#334155',
            wrap: true,
          },
          ...(sosData.landmark
            ? [
                {
                  type: 'text',
                  text: `🚩 จุดสังเกต: ${sosData.landmark}`,
                  size: 'xs',
                  weight: 'bold',
                  color: '#B45309',
                  wrap: true,
                },
              ]
            : []),
          {
            type: 'text',
            text: `📞 เบอร์โทร: ${sosData.primaryPhone}`,
            size: 'xs',
            weight: 'bold',
            color: '#059669',
          },
          ...(cleanLineId
            ? [
                {
                  type: 'text',
                  text: `💬 LINE ID: @${cleanLineId}`,
                  size: 'xs',
                  weight: 'bold',
                  color: '#06C755',
                },
              ]
            : []),
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#0F172A',
            height: 'sm',
            action: {
              type: 'uri',
              label: '🗺️ เปิด Google Maps นำทาง',
              uri: mapsUrl,
            },
          },
          ...(cleanLineId
            ? [
                {
                  type: 'button',
                  style: 'primary',
                  color: '#06C755',
                  height: 'sm',
                  action: {
                    type: 'uri',
                    label: '💬 เปิดแชท LINE กับผู้แจ้ง',
                    uri: `https://line.me/ti/p/~${encodeURIComponent(cleanLineId)}`,
                  },
                },
              ]
            : []),
        ],
      },
    };

    const lineMessage = {
      type: 'flex',
      altText: `🚨 แจ้งขอความช่วยเหลือด่วนน้ำท่วม! #${sosData.id} โดย ${sosData.fullName}`,
      contents: flexContents,
    };

    // If targetId is provided, push to target (group, room, user)
    // Otherwise broadcast if channel allows
    const endpoint = targetId
      ? 'https://api.line.me/v2/bot/message/push'
      : 'https://api.line.me/v2/bot/message/broadcast';

    const payload = targetId
      ? { to: targetId, messages: [lineMessage] }
      : { messages: [lineMessage] };

    const lineRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!lineRes.ok) {
      const errText = await lineRes.text();
      console.error('LINE Messaging API error:', errText);
      return res.status(200).json({
        success: false,
        message: `LINE API ส่งไม่สำเร็จ: ${errText}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'ส่งแจ้งเตือนการ์ดเข้า LINE กลุ่มกู้ภัยสำเร็จ!',
    });
  } catch (err: any) {
    console.error('Server error handling LINE notification:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
