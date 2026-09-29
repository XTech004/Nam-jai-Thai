import type { SOSRequest, EmergencyContact } from '../types/sos';

export const INITIAL_MOCK_REQUESTS: SOSRequest[] = [
  {
    id: 'SOS-2026-001',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(), // 25 mins ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    urgency: 'CRITICAL',
    status: 'PENDING',
    fullName: 'คุณสมศักดิ์ วงศ์สว่าง',
    primaryPhone: '081-234-5678',
    secondaryPhone: '089-987-6543',
    lineId: 'somsak_w',
    province: 'เชียงราย',
    district: 'แม่สาย',
    subDistrict: 'เวียงพางคำ',
    address: '142/3 หมู่ 4 ซอยเกาะทราย 5',
    landmark: 'บ้านปูน 2 ชั้น รั้วสีฟ้า อยู่ติดกับร้านขายของชำป้าพร มีผ้าแดงผูกตรงระเบียงชั้น 2',
    coordinates: {
      lat: 20.4328,
      lng: 99.8821,
      accuracy: 8
    },
    waterLevel: 'SECOND_FLOOR',
    people: {
      adults: 2,
      elderly: 1,
      bedridden: 1,
      children: 2,
      pets: 1
    },
    needs: [
      'เรือท้องแบน/เรือกู้ภัยอพยพด่วน',
      'การอพยพผู้ป่วยติดเตียง (ต้องใช้ออกซิเจน)',
      'น้ำดื่มสะอาดและอาหารสำเร็จรูป',
      'นมผงและผ้าอ้อมเด็ก'
    ],
    notes: 'น้ำไหลเชี่ยวมาก ระดับน้ำชั้นล่างมิดศีรษะแล้ว ตอนนี้ผู้ป่วยติดเตียงอยู่บนเตียงชั้น 2 แบตเตอรี่มือถือเหลือ 15%',
    responderNotes: '',
  },
  {
    id: 'SOS-2026-002',
    createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(), // 1 hour ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    urgency: 'CRITICAL',
    status: 'RESPONDING',
    fullName: 'คุณรัตนาภรณ์ จิตต์เจริญ',
    primaryPhone: '095-432-1100',
    lineId: 'rattana_bkk',
    province: 'เชียงราย',
    district: 'เมืองเชียงราย',
    subDistrict: 'ริมกก',
    address: '88/12 หมู่บ้านริมน้ำกก ซอย 3',
    landmark: 'หลังคาสีเขียว อยู่ตรงข้ามวัดฝั่งหมิ่น มีคนใส่เสื้อส้มโบกธงอยู่บนดาดฟ้า',
    coordinates: {
      lat: 19.9215,
      lng: 99.8450,
      accuracy: 12
    },
    waterLevel: 'ROOF_TOP',
    people: {
      adults: 3,
      elderly: 2,
      bedridden: 0,
      children: 1,
      pets: 2
    },
    needs: [
      'เรือท้องแบน/เรือกู้ภัยอพยพด่วน',
      'เสื้อชูชีพและเชือกกู้ภัย',
      'น้ำดื่มและอาหารแห้ง'
    ],
    notes: 'น้ำล้นตลิ่งพัดกระสอบทรายพังหมดแล้ว ทั้งหมด 6 ชีวิตหนีขึ้นไปหลบอยู่บนหลังคา/ดาดฟ้าชั้นบนสุด ฝนยังตกปรอยๆ',
    responderNotes: 'ทีมกู้ภัยสว่างเชียงราย กำลังนำเจ็ตสกีและเรือยนต์เข้าพื้นที่ คาดถึงจุดเกิดเหตุใน 15 นาที',
    rescuedBy: 'ทีมกู้ภัยสว่างเชียงราย (ชุดที่ 3)'
  },
  {
    id: 'SOS-2026-003',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    urgency: 'URGENT',
    status: 'PENDING',
    fullName: 'คุณประดิษฐ์ ชัยวรสาร',
    primaryPhone: '086-778-9912',
    province: 'หนองคาย',
    district: 'ท่าบ่อ',
    subDistrict: 'กองนาง',
    address: '29 หมู่ 2 ถนนเลียบโขง',
    landmark: 'บ้านไม้ยกใต้ถุนสูง ใกล้ศาลาประชาคม มีเรือหางยาวเก่าจอดผูกอยู่',
    coordinates: {
      lat: 17.8540,
      lng: 102.5920,
      accuracy: 15
    },
    waterLevel: 'WAIST_CHEST',
    people: {
      adults: 2,
      elderly: 2,
      bedridden: 0,
      children: 0,
      pets: 3
    },
    needs: [
      'น้ำดื่มสะอาด/อาหารกล่อง',
      'ยาความดัน/ยาเบาหวาน',
      'ไฟฉายและถ่านไฟฉาย',
      'อาหารสำหรับสุนัข'
    ],
    notes: 'น้ำโขงหนุนสูงเข้าท่วมชั้นล่างระดับเอว ตัดไฟฟ้าในพื้นที่แล้ว ไม่ต้องการอพยพแต่อยากได้เสบียงและน้ำดื่มสำรอง 2-3 วัน',
  },
  {
    id: 'SOS-2026-004',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    urgency: 'NORMAL',
    status: 'COMPLETED',
    fullName: 'ป้ามาลี เพชรสงคราม',
    primaryPhone: '083-999-1234',
    province: 'พระนครศรีอยุธยา',
    district: 'เสนา',
    subDistrict: 'หัวเวียง',
    address: '55 หมู่ 1 คลองบางบาล',
    landmark: 'บ้านเรือนไทยติดริมคลอง ใกล้สะพานข้ามคลองเสนา',
    coordinates: {
      lat: 14.3290,
      lng: 100.4120,
      accuracy: 10
    },
    waterLevel: 'ANKLE_KNEE',
    people: {
      adults: 2,
      elderly: 1,
      bedridden: 0,
      children: 0,
      pets: 0
    },
    needs: [
      'ถุงยังชีพ/อาหารกระป๋อง',
      'ยาทากันน้ำกัดเท้าและยาสามัญ'
    ],
    notes: 'น้ำเริ่มปริ่มเข้าใต้ถุน ปภ.และเทศบาลได้นำเรือแจกถุงยังชีพส่งมอบเรียบร้อยแล้ว',
    responderNotes: 'เทศบาลตำบลหัวเวียงนำถุงยังชีพและน้ำดื่มส่งมอบถึงบ้านเรียบร้อยแล้ว',
    rescuedBy: 'ทีมงานเทศบาลตำบลหัวเวียง'
  },
  {
    id: 'SOS-2026-005',
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 mins ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    urgency: 'CRITICAL',
    status: 'PENDING',
    fullName: 'คุณอนันต์ สุวรรณเวช',
    primaryPhone: '082-114-9988',
    secondaryPhone: '091-887-2233',
    province: 'สุโขทัย',
    district: 'สวรรคโลก',
    subDistrict: 'เมืองบางยม',
    address: '109 หมู่ 5',
    landmark: 'ข้างโรงสีเก่า ทางเข้าซอยน้ำเชี่ยวแรง มีเสาไฟฟ้าเอียงอยู่ปากซอย',
    coordinates: {
      lat: 17.1580,
      lng: 99.8210,
      accuracy: 9
    },
    waterLevel: 'WAIST_CHEST',
    people: {
      adults: 1,
      elderly: 2,
      bedridden: 1,
      children: 0,
      pets: 1
    },
    needs: [
      'เรือท้องแบน/เรือกู้ภัยอพยพด่วน',
      'การอพยพผู้ป่วยติดเตียง',
      'น้ำดื่มและอาหาร'
    ],
    notes: 'พนังกั้นน้ำยมแตก น้ำไหลทะลักแรงมาก รถยนต์จมน้ำหมดแล้ว ผู้สูงอายุเดินไม่ได้ ต้องการเรือกู้ภัยกำลังเครื่องแรงเข้าช่วยด่วนครับ',
  }
];

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    name: '1784 สายด่วนนิรภัย ปภ.',
    phone: '1784',
    desc: 'กรมป้องกันและบรรเทาสาธารณภัย รับแจ้งเหตุสาธารณภัย อุทกภัย และประสานงานกู้ภัย 24 ชม.',
    iconType: 'shield',
    category: 'national'
  },
  {
    name: '1669 การแพทย์ฉุกเฉิน (สพฉ.)',
    phone: '1669',
    desc: 'เจ็บป่วยฉุกเฉิน ผู้ป่วยติดเตียง อุบัติเหตุ บาดเจ็บหนัก หรือต้องการความช่วยเหลือทางการแพทย์ทันที',
    iconType: 'ambulance',
    category: 'medical'
  },
  {
    name: '199 ดับเพลิงและกู้ภัย',
    phone: '199',
    desc: 'ศูนย์วิทยุพระราม ศูนย์บรรเทาสาธารณภัย กู้ภัยทางน้ำ ช่วยเหลือค้นหาผู้สูญหาย',
    iconType: 'truck',
    category: 'rescue'
  },
  {
    name: '1193 ตำรวจทางหลวง',
    phone: '1193',
    desc: 'สอบถามเส้นทางน้ำท่วม ทางเลี่ยง ทางปิดสัญจร และขอความช่วยเหลือรถติดน้ำท่วมบนทางหลวง',
    iconType: 'shield',
    category: 'national'
  },
  {
    name: '1586 สายด่วนกรมทางหลวง',
    phone: '1586',
    desc: 'รายงานสภาพถนน สะพานขาด และเส้นทางสัญจรทั่วประเทศตลอด 24 ชั่วโมง',
    iconType: 'truck',
    category: 'national'
  },
  {
    name: '1129 การไฟฟ้าส่วนภูมิภาค (PEA)',
    phone: '1129',
    desc: 'แจ้งตัดกระแสไฟฟ้าเสี่ยงอันตราย ไฟฟ้ารั่ว เสาไฟฟ้าล้ม น้ำท่วมหม้อแปลง',
    iconType: 'utility',
    category: 'utility'
  },
  {
    name: '1125 การประปาส่วนภูมิภาค (กปภ.)',
    phone: '1125',
    desc: 'แจ้งท่อประปาแตก ขาดแคลนน้ำประปาสะอาด หรือสอบถามการจ่ายน้ำ',
    iconType: 'utility',
    category: 'utility'
  },
  {
    name: '1300 ศูนย์ช่วยเหลือสังคม พม.',
    phone: '1300',
    desc: 'กระทรวง พม. ให้ความช่วยเหลือกลุ่มเปราะบาง เด็ก สตรี คนพิการ และผู้สูงอายุที่ประสบภัย',
    iconType: 'phone',
    category: 'national'
  }
];

export const COMMON_NEEDS_LIST = [
  'เรือท้องแบน/เรือกู้ภัยอพยพด่วน',
  'การอพยพผู้ป่วยติดเตียง/คนชรา',
  'น้ำดื่มสะอาด (ขาดแคลนหนัก)',
  'อาหารสำเร็จรูป/ข้าวกล่อง/อาหารแห้ง',
  'ยารักษาโรคประจำตัว/ชุดปฐมพยาบาล',
  'ผ้าอ้อมผู้ใหญ่/ผ้าอ้อมเด็ก/นมผง',
  'ไฟฉาย/ถ่าน/พาวเวอร์แบงก์ชาร์จไฟ',
  'เสื้อชูชีพ/ห่วงยาง/เชือกกู้ภัย',
  'อาหารสุนัข/แมว/สัตว์เลี้ยง',
  'ตัดกระแสไฟฟ้าด่วน (มีไฟรั่ว)'
];
