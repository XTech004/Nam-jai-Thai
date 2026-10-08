import type { SOSRequest } from '../types/sos';
import { getUrgencyInfo, getWaterLevelInfo, getGoogleMapsUrl } from '../utils/formatters';

const LINE_CONFIG_KEY = 'thai_flood_line_config';

export interface LineMessagingConfig {
  channelAccessToken?: string;
  targetId?: string; // Group ID (c...), Room ID (r...), or User ID (U...)
  webhookUrl?: string; // Optional custom webhook endpoint
  enabled: boolean;
}

/**
 * Get current LINE alert configuration
 */
export function getLineConfig(): LineMessagingConfig {
  try {
    const raw = localStorage.getItem(LINE_CONFIG_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse LINE config:', e);
  }

  return {
    channelAccessToken: import.meta.env.VITE_LINE_CHANNEL_ACCESS_TOKEN || '',
    targetId: import.meta.env.VITE_LINE_TARGET_ID || '',
    webhookUrl: import.meta.env.VITE_LINE_WEBHOOK_URL || '',
    enabled: false,
  };
}

/**
 * Save LINE alert configuration
 */
export function saveLineConfig(config: LineMessagingConfig): void {
  try {
    localStorage.setItem(LINE_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save LINE config:', e);
  }
}

/**
 * Generate LINE Direct Chat URL from user's LINE ID
 */
export function getLineDirectChatUrl(lineId?: string): string | null {
  if (!lineId) return null;
  const clean = lineId.replace(/^@/, '').trim();
  if (!clean) return null;
  return `https://line.me/ti/p/~${encodeURIComponent(clean)}`;
}

/**
 * Generate Pre-filled Rescuer Greeting Text for LINE
 */
export function getRescuerGreetingText(req: SOSRequest): string {
  return `สวัสดีครับ จากทีมกู้ภัยน้ำใจไทย ขอติดต่อคุณ ${req.fullName} กรณีแจ้งขอความช่วยเหลือเคส #${req.id} บริเวณ ${req.address} ต.${req.subDistrict || '-'} อ.${req.district} จ.${req.province} ขณะนี้ทางทีมกู้ภัยกำลังประสานงานเพื่อเข้าช่วยเหลือครับ`;
}

/**
 * Generate LINE Share / Universal Message URL
 */
export function getLineUniversalMsgUrl(text: string): string {
  return `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
}

/**
 * Build rich LINE Flex Message Bubble for flood emergency
 */
export function buildLineFlexMessage(req: SOSRequest) {
  const urgency = getUrgencyInfo(req.urgency);
  const water = getWaterLevelInfo(req.waterLevel);
  const mapsUrl = getGoogleMapsUrl(req.coordinates.lat, req.coordinates.lng);
  const caseWebUrl = `https://nam-jai-thai.vercel.app/?case=${encodeURIComponent(req.id)}`;
  const lineChatUrl = req.lineId ? getLineDirectChatUrl(req.lineId) : null;

  const headerColor = req.urgency === 'CRITICAL' ? '#DC2626' : req.urgency === 'URGENT' ? '#EA580C' : '#0284C7';

  const peopleDetails: string[] = [];
  if (req.people.bedridden > 0) peopleDetails.push(`⚠️ ผู้ป่วยติดเตียง ${req.people.bedridden} คน`);
  if (req.people.elderly > 0) peopleDetails.push(`ผู้สูงอายุ ${req.people.elderly} คน`);
  if (req.people.children > 0) peopleDetails.push(`เด็กเล็ก ${req.people.children} คน`);
  if (req.people.adults > 0) peopleDetails.push(`ผู้ใหญ่ ${req.people.adults} คน`);
  if (req.people.pets > 0) peopleDetails.push(`สัตว์เลี้ยง ${req.people.pets} ตัว`);

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: headerColor,
      paddingAll: '16px',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '🚨 แจ้งกู้ภัยด่วนน้ำท่วม',
              weight: 'bold',
              color: '#FFFFFF',
              size: 'md',
              flex: 1,
            },
            {
              type: 'text',
              text: `#${req.id}`,
              weight: 'bold',
              color: '#FFFFFFCC',
              size: 'xs',
              align: 'end',
            },
          ],
        },
        {
          type: 'text',
          text: urgency.label,
          weight: 'bold',
          color: '#FFFFFF',
          size: 'xs',
          margin: 'sm',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      spacing: 'md',
      contents: [
        // Name & Water Level
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `👤 ผู้ประสบภัย: ${req.fullName}`,
              weight: 'bold',
              size: 'sm',
              color: '#1E293B',
            },
            {
              type: 'text',
              text: `🌊 ระดับน้ำ: ${water.label}`,
              weight: 'bold',
              size: 'xs',
              color: req.waterLevel === 'ROOF_TOP' || req.waterLevel === 'SECOND_FLOOR' ? '#DC2626' : '#D97706',
              margin: 'xs',
            },
          ],
        },
        // People Count
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#F8FAFC',
          cornerRadius: '8px',
          paddingAll: '8px',
          contents: [
            {
              type: 'text',
              text: `👥 รวมผู้ติดค้าง: ${req.people.adults + req.people.elderly + req.people.bedridden + req.people.children} คน`,
              weight: 'bold',
              size: 'xs',
              color: '#0F172A',
            },
            ...(peopleDetails.length > 0
              ? [
                  {
                    type: 'text',
                    text: peopleDetails.join(' | '),
                    size: 'xxs',
                    color: '#64748B',
                    wrap: true,
                    margin: 'xs',
                  },
                ]
              : []),
          ],
        },
        // Address & Landmark
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `📍 ที่อยู่: ${req.address} ต.${req.subDistrict || '-'} อ.${req.district} จ.${req.province}`,
              size: 'xs',
              color: '#334155',
              wrap: true,
            },
            ...(req.landmark
              ? [
                  {
                    type: 'text',
                    text: `🚩 จุดสังเกต: ${req.landmark}`,
                    size: 'xs',
                    weight: 'bold',
                    color: '#B45309',
                    wrap: true,
                    margin: 'xs',
                  },
                ]
              : []),
          ],
        },
        // Contact details
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `📞 เบอร์โทร: ${req.primaryPhone}${req.secondaryPhone ? ` / ${req.secondaryPhone}` : ''}`,
              size: 'xs',
              weight: 'bold',
              color: '#059669',
            },
            ...(req.lineId
              ? [
                  {
                    type: 'text',
                    text: `💬 LINE ID: @${req.lineId.replace(/^@/, '')}`,
                    size: 'xs',
                    weight: 'bold',
                    color: '#06C755',
                    margin: 'xs',
                  },
                ]
              : []),
          ],
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '12px',
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
        ...(lineChatUrl
          ? [
              {
                type: 'button',
                style: 'primary',
                color: '#06C755',
                height: 'sm',
                action: {
                  type: 'uri',
                  label: '💬 เปิดแชท LINE กับผู้แจ้ง',
                  uri: lineChatUrl,
                },
              },
            ]
          : [
              {
                type: 'button',
                style: 'secondary',
                height: 'sm',
                action: {
                  type: 'uri',
                  label: `📞 โทรหาผู้แจ้ง (${req.primaryPhone})`,
                  uri: `tel:${req.primaryPhone}`,
                },
              },
            ]),
        {
          type: 'button',
          style: 'link',
          height: 'sm',
          action: {
            type: 'uri',
            label: '📋 ดูรายละเอียดเคสบนเว็บน้ำใจไทย',
            uri: caseWebUrl,
          },
        },
      ],
    },
  };
}

/**
 * Dispatch LINE Alert for an SOS Request
 * Sends via Serverless API, Webhook, or logs if unconfigured.
 */
export async function sendSosLineAlert(req: SOSRequest): Promise<{ success: boolean; message: string }> {
  const config = getLineConfig();
  const flexBubble = buildLineFlexMessage(req);
  const altText = `🚨 แจ้งขอความช่วยเหลือด่วนน้ำท่วม! เคส #${req.id} (${req.fullName} อ.${req.district} จ.${req.province})`;

  // 1. If serverless API is available on current host (Vercel)
  try {
    const apiRes = await fetch('/api/notify-line', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        request: req,
        config: {
          channelAccessToken: config.channelAccessToken,
          targetId: config.targetId,
        },
      }),
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      return { success: true, message: data.message || 'ส่งแจ้งเตือนเข้า LINE สำเร็จ' };
    }
  } catch (_e) {
    // API not yet reachable or running locally without backend
  }

  // 2. If custom Webhook URL is configured
  if (config.webhookUrl) {
    try {
      const webhookRes = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sos_alert',
          request: req,
          flexMessage: flexBubble,
        }),
      });

      if (webhookRes.ok) {
        return { success: true, message: 'ส่งแจ้งเตือนไปยัง Webhook สำเร็จ' };
      }
    } catch (err: any) {
      console.warn('Webhook dispatch failed:', err);
    }
  }

  // 3. Fallback / simulated local alert
  console.log('[LINE Alert Service] Flex Message Generated for Case:', req.id, flexBubble);
  return {
    success: true,
    message: 'เตรียมข้อมูลแจ้งเตือน LINE พร้อมแล้ว (พร้อมส่งเมื่อเชื่อมต่อ Channel Access Token)',
  };
}
