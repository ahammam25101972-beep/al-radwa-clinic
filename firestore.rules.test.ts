/**
 * Firestore Security Rules Test Specification
 * Verifies that all "Dirty Dozen" adversarial payloads return PERMISSION_DENIED.
 */

export interface AdversarialTestCase {
  id: number;
  name: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  path: string;
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const dirtyDozenTests: AdversarialTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Write',
    operation: 'create',
    path: '/Appointments/apt_01',
    auth: null,
    payload: {
      fullName: 'أحمد محمد علي حسن',
      phone: '01012345678',
      serviceType: 'كشف',
      appointmentDate: '2026-11-10',
      appointmentTime: '02:00 مساءً',
      notes: '',
      status: 'pending',
      userId: 'anon',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Spoof',
    operation: 'create',
    path: '/Appointments/apt_02',
    auth: { uid: 'user_1', email: 'ahammam25101972@gmail.com', email_verified: false },
    payload: {
      fullName: 'أحمد محمد علي حسن',
      phone: '01012345678',
      serviceType: 'كشف',
      appointmentDate: '2026-11-10',
      appointmentTime: '02:00 مساءً',
      notes: '',
      status: 'pending',
      userId: 'user_1',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Identity Spoofing on Create',
    operation: 'create',
    path: '/Appointments/apt_03',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      fullName: 'أحمد محمد علي حسن',
      phone: '01012345678',
      serviceType: 'حشو',
      appointmentDate: '2026-11-10',
      appointmentTime: '03:00 مساءً',
      notes: '',
      status: 'pending',
      userId: 'user_2',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Create',
    operation: 'create',
    path: '/Appointments/apt_04',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      fullName: 'أحمد محمد علي حسن',
      phone: '01012345678',
      serviceType: 'تنظيف',
      appointmentDate: '2026-11-10',
      appointmentTime: '04:00 مساءً',
      notes: '',
      status: 'pending',
      userId: 'user_1',
      isVIP: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Status Shortcutting on Create',
    operation: 'create',
    path: '/Appointments/apt_05',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      fullName: 'أحمد محمد علي حسن',
      phone: '01012345678',
      serviceType: 'تقويم',
      appointmentDate: '2026-11-10',
      appointmentTime: '05:00 مساءً',
      notes: '',
      status: 'confirmed',
      userId: 'user_1',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Client Timestamp Forgery',
    operation: 'create',
    path: '/Appointments/apt_06',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      fullName: 'أحمد محمد علي حسن',
      phone: '01012345678',
      serviceType: 'خلع',
      appointmentDate: '2026-11-10',
      appointmentTime: '06:00 مساءً',
      notes: '',
      status: 'pending',
      userId: 'user_1',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Resource Poisoning (Oversized Name)',
    operation: 'create',
    path: '/Appointments/apt_07',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      fullName: 'أ'.repeat(500),
      phone: '01012345678',
      serviceType: 'تركيبات',
      appointmentDate: '2026-11-10',
      appointmentTime: '07:00 مساءً',
      notes: '',
      status: 'pending',
      userId: 'user_1',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Invalid Service Enum',
    operation: 'create',
    path: '/Appointments/apt_08',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      fullName: 'أحمد محمد علي حسن',
      phone: '01012345678',
      serviceType: 'خدمة غير موجودة',
      appointmentDate: '2026-11-10',
      appointmentTime: '07:00 مساءً',
      notes: '',
      status: 'pending',
      userId: 'user_1',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Cross-Tenant PII Read',
    operation: 'get',
    path: '/Appointments/apt_user1',
    auth: { uid: 'user_2', email: 'user2@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immutable Field Mutation on Update',
    operation: 'update',
    path: '/Appointments/apt_user1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      userId: 'user_2',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Terminal State Re-opening',
    operation: 'update',
    path: '/Appointments/apt_cancelled',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      status: 'pending',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Value Poisoning on Whitelisted Update Key',
    operation: 'update',
    path: '/Appointments/apt_user1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      status: 'confirmed',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
