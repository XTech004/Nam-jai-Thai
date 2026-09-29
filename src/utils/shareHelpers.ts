import type { SOSRequest } from '../types/sos';
import { getWaterLevelInfo, getUrgencyInfo, getGoogleMapsUrl } from './formatters';

export function buildSosShareText(req: SOSRequest): string {
  const urgency = getUrgencyInfo(req.urgency);
  const water = getWaterLevelInfo(req.waterLevel);
  const mapsUrl = getGoogleMapsUrl(req.coordinates.lat, req.coordinates.lng);

  const peopleList: string[] = [];
  if (req.people.adults > 0) peopleList.push(`ผู้ใหญ่ ${req.people.adults} คน`);
  if (req.people.elderly > 0) peopleList.push(`ผู้สูงอายุ ${req.people.elderly} คน`);
  if (req.people.bedridden > 0) peopleList.push(`⚠️ ผู้ป่วยติดเตียง/พิการ ${req.people.bedridden} คน`);
  if (req.people.children > 0) peopleList.push(`เด็ก/ทารก ${req.people.children} คน`);
  if (req.people.pets > 0) peopleList.push(`สัตว์เลี้ยง ${req.people.pets} ตัว`);

  return `🚨 แจ้งขอความช่วยเหลือด่วนน้ำท่วม!
รหัสเคส: ${req.id}
ระดับความเร่งด่วน: ${urgency.shortLabel}
ระดับน้ำ: ${water.label}

👤 ผู้ติดต่อ: ${req.fullName}
📞 โทรศัพท์: ${req.primaryPhone}${req.secondaryPhone ? ` / ${req.secondaryPhone}` : ''}
${req.lineId ? `💬 LINE ID: ${req.lineId}` : ''}

📍 พื้นที่: ${req.address} ต.${req.subDistrict || '-'} อ.${req.district} จ.${req.province}
🚩 จุดสังเกตเด่น: ${req.landmark || 'ไม่มีระบุ'}
🗺️ พิกัดแผนที่: ${mapsUrl}
(ละติจูด/ลองจิจูด: ${req.coordinates.lat.toFixed(5)}, ${req.coordinates.lng.toFixed(5)})

👥 สมาชิกที่ติดอยู่: ${peopleList.length > 0 ? peopleList.join(', ') : 'ไม่ระบุ'}
📦 ความต้องการเร่งด่วน:
${req.needs.map((n) => `• ${n}`).join('\n')}
${req.notes ? `\n📝 รายละเอียดเพิ่มเติม: ${req.notes}` : ''}

#น้ำท่วม #ช่วยเหลือน้ำท่วม #ThaiFloodSOS`;
}

export function getSmsLink(recipientPhone: string, bodyText: string): string {
  // Safe SMS link for mobile browsers
  const encodedBody = encodeURIComponent(bodyText);
  return `sms:${recipientPhone}?body=${encodedBody}`;
}

export function getLineShareUrl(text: string): string {
  return `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback using textarea element
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}
