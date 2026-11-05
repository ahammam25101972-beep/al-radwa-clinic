import React, { useState, useEffect, useRef } from 'react';
import {
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  Calendar,
  Clock,
  Phone,
  UserCheck,
  MessageSquare,
  Send,
  X,
  Check,
  ExternalLink,
  LogIn,
  LogOut,
  AlertCircle,
  ShieldCheck,
  ArrowUpLeft,
  GraduationCap,
  Award,
  Stethoscope,
} from 'lucide-react';
import {
  db,
  auth,
  loginWithGoogle,
  logoutUser,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  EL_RADWA_LOGO_DATA_URI,
  DOCTOR_PORTRAIT_DATA_URI,
} from './assets/clinicAssets';

type ServiceName = 'كشف' | 'حشو' | 'خلع' | 'تنظيف' | 'تركيبات' | 'تقويم';

interface ClinicService {
  id: ServiceName;
  index: string;
  kicker: string;
  title: ServiceName;
  subtitle: string;
  description: string;
  duration: string;
  category: 'clinical' | 'cosmetic';
  featured?: boolean;
}

interface AppointmentRecord {
  id: string;
  fullName: string;
  phone: string;
  serviceType: ServiceName;
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  userId: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const CLINIC_LOGO_SRC =
  '/assets/aistudio/Gemini_Generated_Image_a00hj9a00hj9a00h_06b9854e.jpg';
const DOCTOR_PHOTO_SRC =
  '/assets/aistudio/Gemini_Generated_Image_ahrirmahrirmahri_99b82ed6.jpg';

const DOCTOR_PROFILE = {
  name: 'د. محمد الشربيني',
  title: 'مؤسس ومدير عيادة الرضوى — أخصائي طب وجراحة وتجميل الأسنان',
  summary:
    'يتمتع الدكتور محمد الشربيني بخبرة إكلينيكية واسعة في تشخيص وعلاج أمراض الفم والأسنان، مع تركيز خاص على طب الأسنان التجميلي والتحفظي، التركيبات الثابتة والمتحركة (الزيركون والبورسلين)، وعلاج الجذور وتقويم الأسنان الحديث وفق أحدث البروتوكولات الطبية العالمية غير المؤلمة.',
  qualifications: [
    'بكالوريوس طب وجراحة الفم والأسنان (BDS).',
    'دبلوم وتدريب متقدم في التركيبات الثابتة وتصميم الابتسامة الرقمي (Digital Smile Design).',
    'شهادات معتمدة في العلاج التحفظي وعلاج الجذور والأعصاب بأحدث الأجهزة الدوارة (Rotary Endodontics).',
    'عضو النقابة العامة لأطباء الأسنان والمؤتمرات الدولية لطب الأسنان التجميلي.',
  ],
  experiences: [
    'مؤسس ومدير عيادة الرضوى لطب وجراحة الأسنان — إشراف كامل على الخطط العلاجية والتجميلية.',
    'خبرة عملية ممتدة في إجراء آلاف الحالات الناجحة للحشوات التجميلية والتركيبات الثابتة والمتحركة.',
    'خبرة متخصصة في الجراحات الفموية الآمنة وخلع ضروس العقل المدفونة بدون ألم.',
    'تطبيق أعلى معايير مكافحة العدوى والتعقيم القياسي (Autoclave Class B) لضمان سلامة المرضى.',
  ],
  specialties: [
    'تجميل الأسنان وتصميم الابتسامة (تركيبات الزيركون والعدسات التجميلية)',
    'علاج الجذور والأعصاب الدقيق في جلسة واحدة',
    'الحشوات التجميلية الضوئية المطابقة للون الأسنان الطبيعي',
    'تقويم الأسنان المعدني والشفاف لتصحيح إطباق الفكين',
    'جراحة الفم والخلع الآمن وعلاج التهابات اللثة',
  ],
};

const CLINIC_SERVICES: ClinicService[] = [
  {
    id: 'كشف',
    index: '01',
    kicker: 'التشخيص والفحص الشامل',
    title: 'كشف',
    subtitle: 'فحص إكلينيكي متكامل وخطة علاجية واضحة',
    description:
      'فحص دقيق للأسنان واللثة والفكين لتحديد سبب الألم أو المشكلة بدقة، مع شرح تفصيلي لخيارات العلاج المتاحة وتحديد التكلفة المناسبة بعد المعاينة.',
    duration: '20 – 30 دقيقة',
    category: 'clinical',
    featured: true,
  },
  {
    id: 'حشو',
    index: '02',
    kicker: 'العلاج التحفظي والتجميلي',
    title: 'حشو',
    subtitle: 'حشوات تجميلية بلون السن الطبيعي وعلاج الجذور',
    description:
      'إزالة التسوسات السطحية والعميقة وتعويض بنية السن المفقودة باستخدام حشوات الضوئية (الكومبوزيت) عالية المتانة والمطابقة للون الأسنان الطبيعي.',
    duration: '30 – 45 دقيقة',
    category: 'clinical',
  },
  {
    id: 'خلع',
    index: '03',
    kicker: 'الجراحة الفموية الآمنة',
    title: 'خلع',
    subtitle: 'خلع بسيط وجراحي لضروس العقل بدون ألم',
    description:
      'إجراءات خلع الأسنان المتضررة وضروس العقل المدفونة بأحدث الأدوات الجراحية وتحت تخدير موضعي فعال يضمن أقصى درجات الراحة والأمان.',
    duration: '20 – 40 دقيقة',
    category: 'clinical',
  },
  {
    id: 'تنظيف',
    index: '04',
    kicker: 'صحة اللثة والوقاية',
    title: 'تنظيف',
    subtitle: 'إزالة الجير والتصبغات وتلميع الأسنان',
    description:
      'جلسات تنظيف عميق للأسنان واللثة بالموجات فوق الصوتية (Ultrasonic) لإزالة الرواسب الجيرية والتصبغات الخارجية واستعادة انتعاش الفم.',
    duration: '30 دقيقة',
    category: 'cosmetic',
  },
  {
    id: 'تركيبات',
    index: '05',
    kicker: 'التعويضات السنية الدقيقة',
    title: 'تركيبات',
    subtitle: 'تركيبات ثابتة ومتحركة (زيركون وإيماكس)',
    description:
      'تعويض الأسنان المفقودة أو حماية الأسنان المعالجة عصبياً عبر تيجان وجسور الزيركون والبورسلين المصممة رقمياً لمحاكاة الأسنان الطبيعية.',
    duration: '45 دقيقة',
    category: 'cosmetic',
    featured: true,
  },
  {
    id: 'تقويم',
    index: '06',
    kicker: 'تجميل واصطفاف الأسنان',
    title: 'تقويم',
    subtitle: 'تقويم معدني وشفاف لتصحيح الإطباق',
    description:
      'خطط تقويمية متكاملة للأطفال والبالغين لمعالجة تزاحم الأسنان وبروز الفكين والفراغات، مع متابعة دورية دقيقة للوصول إلى ابتسامة متناسقة.',
    duration: '30 – 45 دقيقة',
    category: 'cosmetic',
  },
];

const TIME_SLOTS = [
  '12:00 ظهراً',
  '01:00 مساءً',
  '02:00 مساءً',
  '03:00 مساءً',
  '04:00 مساءً',
  '05:00 مساءً',
  '06:00 مساءً',
  '07:00 مساءً',
  '08:00 مساءً',
  '09:00 مساءً',
];

const FACEBOOK_URL = 'https://www.facebook.com/share/1BLV2ZjEsW/';
const ADMIN_EMAIL = 'ahammam25101972@gmail.com';

function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function App() {
  const [activePage, setActivePage] = useState<'home' | 'doctor'>('home');
  const [doctorPhotoSrc, setDoctorPhotoSrc] = useState<string>(DOCTOR_PHOTO_SRC);
  const [clinicLogoSrc, setClinicLogoSrc] = useState<string>(CLINIC_LOGO_SRC);

  // Authentication & Firestore state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Filter state for services
  const [serviceFilter, setServiceFilter] = useState<'all' | 'clinical' | 'cosmetic'>('all');

  // Booking form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState<ServiceName>('كشف');
  const [appointmentDate, setAppointmentDate] = useState(getTodayDateString());
  const [appointmentTime, setAppointmentTime] = useState(TIME_SLOTS[2]);
  const [notes, setNotes] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingMessage, setBookingMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Floating Gemini Chat Widget state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text: 'مرحباً بك في عيادة الرضوى لطب الأسنان تحت إشراف د. محمد الشربيني! مواعيد العمل من السبت للخميس من 12 ظهراً حتى 10 مساءً. كيف يمكنني الإجابة عن استفسارك اليوم؟',
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (user?.displayName && !fullName) {
        setFullName(user.displayName);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to Firestore Appointments when authenticated
  useEffect(() => {
    if (!authReady || !currentUser) {
      setAppointments([]);
      return;
    }

    setFirestoreError(null);
    const isAdminUser = currentUser.email === ADMIN_EMAIL;
    const appointmentsRef = collection(db, 'Appointments');
    const q = isAdminUser
      ? query(appointmentsRef)
      : query(appointmentsRef, where('userId', '==', currentUser.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: AppointmentRecord[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            fullName: String(data.fullName || ''),
            phone: String(data.phone || ''),
            serviceType: (data.serviceType as ServiceName) || 'كشف',
            appointmentDate: String(data.appointmentDate || ''),
            appointmentTime: String(data.appointmentTime || ''),
            notes: String(data.notes || ''),
            status: data.status || 'pending',
            userId: String(data.userId || ''),
            createdAt: data.createdAt || null,
            updatedAt: data.updatedAt || null,
          };
        });
        list.sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate));
        setAppointments(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'Appointments');
        } catch (formattedErr) {
          setFirestoreError(
            formattedErr instanceof Error ? formattedErr.message : String(formattedErr)
          );
        }
      }
    );

    return () => unsubscribe();
  }, [authReady, currentUser]);

  // Auto-scroll chat widget
  useEffect(() => {
    if (chatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  const handleSelectServiceForBooking = (service: ServiceName) => {
    setActivePage('home');
    setServiceType(service);
    setTimeout(() => {
      const el = document.getElementById('booking');
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const navigateToSection = (sectionId: string) => {
    setActivePage('home');
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleGoogleSignIn = async () => {
    setBookingMessage(null);
    try {
      await loginWithGoogle();
    } catch (error) {
      setBookingMessage({
        type: 'error',
        text:
          error instanceof Error
            ? `تعذر تسجيل الدخول: ${error.message}`
            : 'تعذر تسجيل الدخول باستخدام حساب Google.',
      });
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingMessage(null);
    setFirestoreError(null);

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedNotes = notes.trim();

    if (trimmedName.length < 3 || trimmedName.length > 120) {
      setBookingMessage({
        type: 'error',
        text: 'يرجى إدخال الاسم الرباعي بشكل صحيح (بين 3 و 120 حرفاً).',
      });
      return;
    }

    const phoneRegex = /^[0-9+\-\s()]{8,20}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      setBookingMessage({
        type: 'error',
        text: 'يرجى إدخال رقم هاتف صحيح (من 8 إلى 20 رقماً).',
      });
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(appointmentDate)) {
      setBookingMessage({
        type: 'error',
        text: 'يرجى اختيار تاريخ صحيح للموعد.',
      });
      return;
    }

    const selectedDay = new Date(`${appointmentDate}T12:00:00`).getDay();
    if (selectedDay === 5) {
      setBookingMessage({
        type: 'error',
        text: 'العيادة في عطلة رسمية يوم الجمعة. مواعيد العمل من السبت للخميس (12 ظهراً – 10 مساءً).',
      });
      return;
    }

    let activeUser = currentUser;
    if (!activeUser) {
      try {
        const credential = await loginWithGoogle();
        activeUser = credential.user;
      } catch {
        setBookingMessage({
          type: 'error',
          text: 'يرجى تسجيل الدخول بحساب Google أولاً لتأكيد وحفظ الموعد في قاعدة بيانات العيادة.',
        });
        return;
      }
    }

    setSubmittingBooking(true);
    try {
      await addDoc(collection(db, 'Appointments'), {
        fullName: trimmedName,
        phone: trimmedPhone,
        serviceType,
        appointmentDate,
        appointmentTime,
        notes: trimmedNotes.slice(0, 500),
        status: 'pending',
        userId: activeUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setBookingMessage({
        type: 'success',
        text: `تم تسجيل موعدك بنجاح يا ${trimmedName} مع د. محمد الشربيني لخدمة (${serviceType}) يوم ${appointmentDate} الساعة ${appointmentTime}.`,
      });
      setPhone('');
      setNotes('');
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.CREATE, 'Appointments');
      } catch (formattedErr) {
        setFirestoreError(
          formattedErr instanceof Error ? formattedErr.message : String(formattedErr)
        );
        setBookingMessage({
          type: 'error',
          text: 'حدث خطأ أثناء حفظ الموعد في قاعدة البيانات. يرجى التحقق من الصلاحيات والمحاولة مجدداً.',
        });
      }
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleUpdateAppointmentStatus = async (
    appointmentId: string,
    newStatus: 'confirmed' | 'cancelled' | 'completed'
  ) => {
    setFirestoreError(null);
    try {
      await updateDoc(doc(db, 'Appointments', appointmentId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      try {
        handleFirestoreError(
          error,
          OperationType.UPDATE,
          `Appointments/${appointmentId}`
        );
      } catch (formattedErr) {
        setFirestoreError(
          formattedErr instanceof Error ? formattedErr.message : String(formattedErr)
        );
      }
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    setFirestoreError(null);
    try {
      await deleteDoc(doc(db, 'Appointments', appointmentId));
    } catch (error) {
      try {
        handleFirestoreError(
          error,
          OperationType.DELETE,
          `Appointments/${appointmentId}`
        );
      } catch (formattedErr) {
        setFirestoreError(
          formattedErr instanceof Error ? formattedErr.message : String(formattedErr)
        );
      }
    }
  };

  const sendChatMessage = async (textToSend?: string) => {
    const promptText = (textToSend ?? chatInput).trim();
    if (!promptText || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: promptText,
    };

    const updatedHistory = [...chatMessages, userMsg];
    setChatMessages(updatedHistory);
    if (!textToSend) {
      setChatInput('');
    }
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          history: chatMessages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'تعذر الاتصال بالمساعد الذكي حالياً.');
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          text: data.reply,
        },
      ]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text:
            error instanceof Error
              ? `عذراً، حدث خطأ: ${error.message}`
              : 'عذراً، تعذر الاتصال بالمساعد الذكي حالياً.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const filteredServices = CLINIC_SERVICES.filter((srv) =>
    serviceFilter === 'all' ? true : srv.category === serviceFilter
  );

  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  // Doctor Profile & CV Section
  const renderDoctorProfileSection = (isDedicatedPage: boolean) => (
    <section
      id="doctor-profile"
      className={`${
        isDedicatedPage ? 'py-12 lg:py-16' : 'py-16 lg:py-24'
      } bg-white border-b border-slate-200`}
    >
      <div className="max-w-7xl mx-auto px-6">
        {isDedicatedPage && (
          <div className="mb-8 pb-4 border-b border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              <span>عيادة الرضوى</span>
              <span className="mx-2" aria-hidden="true">/</span>
              <span className="text-teal-700 font-semibold">
                صفحة الدكتور محمد الشربيني والسيرة الذاتية
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActivePage('home')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 underline underline-offset-4 cursor-pointer"
            >
              العودة للصفحة الرئيسية الكاملة
            </button>
          </div>
        )}

        <div className="mb-10">
          <div className="text-xs text-teal-700 font-semibold mb-1.5">
            الإشراف الطبي والخبرة الإكلينيكية
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            {DOCTOR_PROFILE.name}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-1.5">
            {DOCTOR_PROFILE.title}
          </p>
        </div>

        {/* Main 2-Column Doctor Portrait + CV Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Right Column (4 cols on desktop): Attached Doctor Photo Frame & Quick Info */}
          <div className="lg:col-span-4 bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex flex-col items-center justify-center">
              <img
                src={doctorPhotoSrc}
                alt={DOCTOR_PROFILE.name}
                referrerPolicy="no-referrer"
                onError={() => setDoctorPhotoSrc(DOCTOR_PORTRAIT_DATA_URI)}
                className="w-full h-full object-cover object-top"
              />
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="text-lg font-bold text-slate-900">
                {DOCTOR_PROFILE.name}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {DOCTOR_PROFILE.title}
              </p>

              <div className="pt-3 border-t border-slate-200 space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">مواعيد تواجد الطبيب</span>
                  <span className="font-semibold text-slate-800">السبت – الخميس</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">ساعات العيادة</span>
                  <span className="font-mono-tabular font-semibold text-teal-700">
                    12:00 PM – 10:00 PM
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => handleSelectServiceForBooking('كشف')}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>احجز موعد كشف مع الدكتور</span>
                </button>
              </div>
            </div>
          </div>

          {/* Left Column (8 cols on desktop): Full Curriculum Vitae (CV) */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Biography Summary */}
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-7">
              <div className="flex items-center gap-2.5 text-teal-700 font-bold text-base mb-3">
                <Stethoscope className="w-5 h-5 shrink-0" />
                <h3>النبذة المهنية والرؤية العلاجية</h3>
              </div>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                {DOCTOR_PROFILE.summary}
              </p>
            </div>

            {/* 2. Academic Qualifications */}
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-7">
              <div className="flex items-center gap-2.5 text-teal-700 font-bold text-base mb-4">
                <GraduationCap className="w-5 h-5 shrink-0" />
                <h3>المؤهلات العلمية والشهادات</h3>
              </div>
              <div className="divide-y divide-slate-200/80">
                {DOCTOR_PROFILE.qualifications.map((item, idx) => (
                  <div
                    key={idx}
                    className="py-3 first:pt-0 last:pb-0 flex items-start gap-3 text-sm text-slate-700"
                  >
                    <span className="font-mono-tabular text-xs font-bold text-teal-700 mt-0.5">
                      0{idx + 1}.
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Clinical Experience & Specialties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-teal-700 font-bold text-base mb-4">
                  <Award className="w-5 h-5 shrink-0" />
                  <h3>الخبرات الإكلينيكية</h3>
                </div>
                <div className="divide-y divide-slate-200/80">
                  {DOCTOR_PROFILE.experiences.map((exp, idx) => (
                    <div
                      key={idx}
                      className="py-2.5 first:pt-0 last:pb-0 text-xs sm:text-sm text-slate-700 leading-relaxed"
                    >
                      {exp}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-4">
                    التخصصات الدقيقة بالعيادة
                  </h3>
                  <div className="divide-y divide-slate-200/80">
                    {DOCTOR_PROFILE.specialties.map((spec, idx) => (
                      <div
                        key={idx}
                        className="py-2.5 first:pt-0 last:pb-0 text-xs sm:text-sm text-slate-700 flex items-center justify-between gap-2"
                      >
                        <span>{spec}</span>
                        <span className="font-mono-tabular text-xs text-teal-700 font-semibold">
                          0{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <span>إشراف مباشر من د. محمد الشربيني</span>
                  <a
                    href={FACEBOOK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-700 font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <span>صفحة العيادة</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Bar Contract: Strictly 1 row, 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between gap-8">
          {/* Zone 1: Attached Clinic Logo next to 'عيادة الرضوى' in Main Navbar */}
          <button
            type="button"
            onClick={() => setActivePage('home')}
            className="flex items-center gap-3 text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <img
              src={clinicLogoSrc}
              alt="شعار عيادة الرضوى"
              referrerPolicy="no-referrer"
              onError={() => setClinicLogoSrc(EL_RADWA_LOGO_DATA_URI)}
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded-xl shrink-0"
            />
            <span>عيادة الرضوى</span>
          </button>

          {/* Zone 2: 4 concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActivePage('home')}
              className={`hover:text-teal-700 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activePage === 'home' ? 'text-teal-700 font-semibold' : ''
              }`}
            >
              الرئيسية
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePage('doctor');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-teal-700 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activePage === 'doctor' ? 'text-teal-700 font-semibold underline' : ''
              }`}
            >
              د. محمد الشربيني
            </button>
            <button
              type="button"
              onClick={() => navigateToSection('services')}
              className="hover:text-teal-700 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              خدمات العيادة
            </button>
            <button
              type="button"
              onClick={() => navigateToSection('booking')}
              className="hover:text-teal-700 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              حجز المواعيد
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => navigateToSection('booking')}
              className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              احجز موعدك الآن
            </button>
          </div>
        </div>
      </header>

      {activePage === 'doctor' ? (
        <main className="flex-1">
          {renderDoctorProfileSection(true)}
        </main>
      ) : (
        <main className="flex-1">
          {/* 1. Hero & Clinic Overview Section with Attached Logo in Main Page */}
          <section className="bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-6 py-14 lg:py-20">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
                {/* Right Column: Primary Proposition */}
                <div className="lg:col-span-7 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-5">
                      <span className="font-semibold text-teal-700">
                        إشراف د. محمد الشربيني
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>السبت إلى الخميس</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        12:00 ظهراً – 10:00 مساءً
                      </span>
                    </div>

                    <h1
                      className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-[1.2] mb-6 max-w-2xl"
                      style={{ textWrap: 'balance' }}
                    >
                      عيادة الرضوى لطب وجراحة وتجميل الأسنان
                    </h1>

                    <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-[65ch] mb-8">
                      نجمع في عيادة الرضوى تحت إشراف الدكتور محمد الشربيني بين التشخيص الإكلينيكي الدقيق وأحدث تقنيات العلاج التحفظي والتركيبات وزراعة وتقويم الأسنان، لنضمن لك ولعائلتك تجربة علاجية مريحة وآمنة بأعلى معايير التعقيم العالمية.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-3.5">
                      <a
                        href="#booking"
                        className="px-6 py-3 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2"
                      >
                        <span>احجز موعدك الإلكتروني</span>
                        <Calendar className="w-4 h-4" />
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          setActivePage('doctor');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-5 py-3 text-sm font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200/70 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 cursor-pointer"
                      >
                        <span>السيرة الذاتية لـ د. محمد الشربيني</span>
                      </button>

                      <a
                        href={FACEBOOK_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2"
                      >
                        <span>صفحة فيسبوك</span>
                        <ExternalLink className="w-4 h-4 text-slate-500" />
                      </a>
                    </div>

                    <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                      <span>التسعير الطبي يحدد بدقة بعد الكشف والفحص المباشر في العيادة</span>
                      <span>حجز فوري متصل بقاعدة بيانات العيادة</span>
                    </div>
                  </div>
                </div>

                {/* Left Column: Attached EL RADWA CLINIC Logo Showcase & Schedule Card */}
                <div className="lg:col-span-5 flex">
                  <div className="w-full bg-[#F8FAFC] rounded-2xl p-6 sm:p-8 flex flex-col justify-between border border-slate-200">
                    {/* Prominent Attached Clinic Logo in Main Page */}
                    <div className="flex flex-col items-center text-center mb-6">
                      <div className="w-52 h-52 sm:w-60 sm:h-60 mx-auto mb-3 flex items-center justify-center">
                        <img
                          src={clinicLogoSrc}
                          alt="شعار عيادة الرضوى EL RADWA CLINIC"
                          referrerPolicy="no-referrer"
                          onError={() => setClinicLogoSrc(EL_RADWA_LOGO_DATA_URI)}
                          className="w-full h-full object-contain rounded-3xl"
                        />
                      </div>
                      <p className="text-xs font-medium text-slate-500">
                        طب الأسنان التجميلي والتركيبات وزراعة الأسنان
                      </p>
                    </div>

                    <div className="space-y-2.5 py-4 border-y border-slate-200 text-xs sm:text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">الطبيب المعالج</span>
                        <span className="font-bold text-slate-900">د. محمد الشربيني</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">أيام العمل الأسبوعية</span>
                        <span className="font-semibold text-slate-800">السبت – الخميس</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">ساعات استقبال المرضى</span>
                        <span className="font-mono-tabular font-bold text-teal-700">
                          12:00 PM – 10:00 PM
                        </span>
                      </div>
                    </div>

                    <div className="pt-5">
                      <p className="text-xs text-slate-500 mb-2.5">
                        اختر الخدمة للانتقال السريع إلى نموذج الحجز:
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {CLINIC_SERVICES.map((srv) => (
                          <button
                            key={srv.id}
                            type="button"
                            onClick={() => handleSelectServiceForBooking(srv.id)}
                            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-teal-600 hover:text-white border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            {srv.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full-width 4-column Clinical Metrics Strip below Hero split */}
              <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <div className="text-2xl font-bold text-slate-900 font-mono-tabular">
                    د. محمد الشربيني
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    أخصائي طب وجراحة وتجميل الأسنان
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 font-mono-tabular">
                    6 تخصصات
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    كشف · حشو · خلع · تنظيف · تركيبات · تقويم
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 font-mono-tabular">
                    10 ساعات يومياً
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    استقبال متواصل من 12 ظهراً حتى 10 مساءً
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 font-mono-tabular">
                    100% تعقيم
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    بروتوكولات تعقيم أوتوكلاف لكل مريض
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Doctor Mohamed El-Sherbiny Profile & CV Section */}
          {renderDoctorProfileSection(false)}

          {/* 3. Clinic Services Section */}
          <section id="services" className="py-16 lg:py-24 max-w-7xl mx-auto px-6 w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
              <div>
                <div className="text-xs text-teal-700 font-semibold mb-2">
                  التخصصات العلاجية والتجميلية
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  خدمات عيادة الرضوى لطب الأسنان
                </h2>
                <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-2xl">
                  اضغط على أي خدمة لتحديدها تلقائياً في استمارة الحجز الإلكترونية بالأسفل.
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-200/75 rounded-lg self-start">
                <button
                  type="button"
                  onClick={() => setServiceFilter('all')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    serviceFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  جميع الخدمات (6)
                </button>
                <button
                  type="button"
                  onClick={() => setServiceFilter('clinical')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    serviceFilter === 'clinical'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  علاجي وجراحي
                </button>
                <button
                  type="button"
                  onClick={() => setServiceFilter('cosmetic')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    serviceFilter === 'cosmetic'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  تجميلي وتعويضي
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className={`bg-white border rounded-2xl p-7 flex flex-col justify-between transition-colors ${
                    serviceType === service.id
                      ? 'border-teal-600'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <span className="font-mono-tabular font-semibold text-teal-700">
                        {service.index}. {service.kicker}
                      </span>
                      <span className="font-mono-tabular">{service.duration}</span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-1.5">
                      {service.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mb-3">
                      {service.subtitle}
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed mb-6">
                      {service.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      التكلفة تحدد بعد الكشف
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectServiceForBooking(service.id)}
                      className="px-3.5 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-600 hover:text-white rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>احجز {service.title}</span>
                      <ArrowUpLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Appointment Booking System (Firebase Firestore Integration) */}
          <section
            id="booking"
            className="py-16 lg:py-24 bg-white border-t border-slate-200"
          >
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                <div className="lg:col-span-7 bg-[#F8FAFC] border border-slate-200 rounded-2xl p-7 sm:p-9">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-200">
                    <div>
                      <div className="text-xs text-teal-700 font-semibold mb-1">
                        متصل بقاعدة بيانات Firebase Firestore (Appointments)
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900">
                        نموذج حجز موعد مع د. محمد الشربيني
                      </h2>
                    </div>

                    {currentUser ? (
                      <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-lg border border-slate-200 text-xs">
                        <UserCheck className="w-4 h-4 text-teal-600 shrink-0" />
                        <span className="text-slate-700 font-medium truncate max-w-[140px]">
                          {currentUser.displayName || currentUser.email}
                        </span>
                        <button
                          type="button"
                          onClick={() => logoutUser()}
                          className="text-slate-500 hover:text-red-600 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                          title="تسجيل الخروج"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>خروج</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5 text-teal-600" />
                        <span>تسجيل الدخول بحساب Google</span>
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleBookingSubmit} className="space-y-5">
                    <div>
                      <label
                        htmlFor="fullNameInput"
                        className="block text-sm font-semibold text-slate-800 mb-2"
                      >
                        الاسم الرباعي للمريض <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="fullNameInput"
                        type="text"
                        required
                        minLength={3}
                        maxLength={120}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="أدخل الاسم الرباعي بالكامل (مثال: محمد أحمد محمود علي)"
                        className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label
                          htmlFor="phoneInput"
                          className="block text-sm font-semibold text-slate-800 mb-2"
                        >
                          رقم الهاتف للتواصل <span className="text-red-600">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="phoneInput"
                            type="tel"
                            required
                            minLength={8}
                            maxLength={20}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="01012345678"
                            className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600 font-mono-tabular"
                          />
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="serviceSelect"
                          className="block text-sm font-semibold text-slate-800 mb-2"
                        >
                          نوع الخدمة المطلوبة <span className="text-red-600">*</span>
                        </label>
                        <select
                          id="serviceSelect"
                          value={serviceType}
                          onChange={(e) => setServiceType(e.target.value as ServiceName)}
                          className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                        >
                          {CLINIC_SERVICES.map((srv) => (
                            <option key={srv.id} value={srv.id}>
                              {srv.title} — {srv.subtitle}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label
                          htmlFor="dateInput"
                          className="block text-sm font-semibold text-slate-800 mb-2"
                        >
                          تاريخ الموعد (السبت – الخميس){' '}
                          <span className="text-red-600">*</span>
                        </label>
                        <input
                          id="dateInput"
                          type="date"
                          required
                          min={getTodayDateString()}
                          value={appointmentDate}
                          onChange={(e) => setAppointmentDate(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600 font-mono-tabular"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="timeSelect"
                          className="block text-sm font-semibold text-slate-800 mb-2"
                        >
                          الوقت المفضل (12 ظهراً – 10 مساءً){' '}
                          <span className="text-red-600">*</span>
                        </label>
                        <div className="relative">
                          <select
                            id="timeSelect"
                            value={appointmentTime}
                            onChange={(e) => setAppointmentTime(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                          >
                            {TIME_SLOTS.map((slot) => (
                              <option key={slot} value={slot}>
                                {slot}
                              </option>
                            ))}
                          </select>
                          <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="notesInput"
                        className="block text-sm font-semibold text-slate-800 mb-2"
                      >
                        ملاحظات إضافية أو أعراض تشعر بها (اختياري)
                      </label>
                      <textarea
                        id="notesInput"
                        rows={2}
                        maxLength={500}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="اكتب أي تفاصيل تود إبلاغ الدكتور محمد الشربيني بها قبل الموعد..."
                        className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                      />
                    </div>

                    {bookingMessage && (
                      <div
                        role="alert"
                        className={`p-4 rounded-lg text-sm flex items-start gap-2.5 border ${
                          bookingMessage.type === 'success'
                            ? 'bg-teal-50 text-teal-900 border-teal-200'
                            : 'bg-red-50 text-red-900 border-red-200'
                        }`}
                      >
                        {bookingMessage.type === 'success' ? (
                          <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        )}
                        <span>{bookingMessage.text}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submittingBooking}
                      className="w-full py-3 px-6 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                    >
                      {submittingBooking
                        ? 'جاري حفظ الموعد في قاعدة البيانات...'
                        : currentUser
                        ? 'تأكيد وإرسال الحجز'
                        : 'تسجيل الدخول وتأكيد الحجز'}
                    </button>
                  </form>
                </div>

                {/* Live Appointments List Column */}
                <div id="appointments-list" className="lg:col-span-5 space-y-6">
                  <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-7">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <h3 className="text-lg font-bold text-slate-900">
                        {isAdmin
                          ? 'لوحة إدارة حجوزات العيادة (مشرف)'
                          : 'مواعيدي المحجوزة في عيادة الرضوى'}
                      </h3>
                      <span className="text-xs text-slate-500 font-mono-tabular">
                        {appointments.length} موعد
                      </span>
                    </div>

                    {!currentUser ? (
                      <div className="py-8 text-center space-y-4">
                        <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-sm text-slate-600 max-w-sm mx-auto">
                          حفاظاً على خصوصية بيانات المرضى وأرقام الهواتف، يرجى تسجيل الدخول بحساب Google لعرض مواعيدك المسجلة أو إدارة حجوزاتك.
                        </p>
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>تسجيل الدخول لعرض مواعيدي</span>
                        </button>
                      </div>
                    ) : appointments.length === 0 ? (
                      <div className="py-8 text-center text-sm text-slate-500">
                        لا توجد مواعيد مسجلة حتى الآن. استخدم النموذج المجاور لإضافة أول حجز لك في مجموعة{' '}
                        <code className="font-mono-tabular text-xs">Appointments</code>.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[420px] overflow-y-auto pl-1">
                        {appointments.map((apt) => (
                          <div
                            key={apt.id}
                            className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-sm text-slate-900">
                                  {apt.fullName}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                  <span>الخدمة: {apt.serviceType}</span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono-tabular">{apt.phone}</span>
                                </div>
                              </div>

                              <span className="text-xs font-medium text-slate-600">
                                {apt.status === 'pending' && 'قيد المراجعة'}
                                {apt.status === 'confirmed' && 'مؤكد'}
                                {apt.status === 'completed' && 'مكتمل'}
                                {apt.status === 'cancelled' && 'ملغى'}
                              </span>
                            </div>

                            <div className="text-xs text-slate-600 pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="font-mono-tabular">
                                {apt.appointmentDate} · {apt.appointmentTime}
                              </span>

                              <div className="flex items-center gap-2">
                                {apt.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateAppointmentStatus(apt.id, 'cancelled')
                                    }
                                    className="text-xs text-red-600 hover:underline cursor-pointer"
                                  >
                                    إلغاء الموعد
                                  </button>
                                )}
                                {isAdmin && apt.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateAppointmentStatus(apt.id, 'confirmed')
                                    }
                                    className="text-xs text-teal-700 font-semibold hover:underline cursor-pointer"
                                  >
                                    تأكيد
                                  </button>
                                )}
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAppointment(apt.id)}
                                    className="text-xs text-slate-400 hover:text-red-600 cursor-pointer"
                                  >
                                    حذف
                                  </button>
                                )}
                              </div>
                            </div>

                            {apt.notes && (
                              <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                                ملاحظة: {apt.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {firestoreError && (
                      <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 break-all">
                        تنبيه قاعدة البيانات: {firestoreError}
                      </div>
                    )}
                  </div>

                  {/* Direct Facebook Contact Box */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        صفحة عيادة الرضوى على فيسبوك
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        تابع أحدث النصائح الطبية وتواصل مع فريق الاستقبال مباشرة.
                      </p>
                    </div>
                    <a
                      href={FACEBOOK_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
                    >
                      <span>زيارة الصفحة</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Quiet Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">عيادة الرضوى</span>
            <span aria-hidden="true">·</span>
            <span>د. محمد الشربيني</span>
            <span aria-hidden="true">·</span>
            <span>السبت للخميس (12 ظهراً – 10 مساءً)</span>
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => {
                setActivePage('doctor');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              د. محمد الشربيني
            </button>
            <button
              type="button"
              onClick={() => navigateToSection('services')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              الخدمات
            </button>
            <button
              type="button"
              onClick={() => navigateToSection('booking')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              حجز موعد
            </button>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 transition-colors"
            >
              صفحة الفيسبوك
            </a>
          </div>
        </div>
      </footer>

      {/* Floating Smart Assistant Chat Widget (Gemini API) */}
      <div className="fixed bottom-5 left-5 z-50">
        {chatOpen ? (
          <div className="w-[360px] max-w-[calc(100vw-2.5rem)] h-[490px] max-h-[75vh] bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">
                  المساعد الذكي — عيادة الرضوى
                </div>
                <div className="text-[11px] text-slate-300">
                  إشراف د. محمد الشربيني · 12 ظهراً – 10 مساءً
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="إغلاق نافذة الدردشة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => sendChatMessage('من هو الطبيب المشرف على عيادة الرضوى؟')}
                className="px-2.5 py-1 text-[11px] font-medium bg-white border border-slate-200 rounded-md text-slate-700 hover:border-teal-600 whitespace-nowrap shrink-0 cursor-pointer"
              >
                عن د. محمد الشربيني
              </button>
              <button
                type="button"
                onClick={() => sendChatMessage('ما هي مواعيد عمل عيادة الرضوى؟')}
                className="px-2.5 py-1 text-[11px] font-medium bg-white border border-slate-200 rounded-md text-slate-700 hover:border-teal-600 whitespace-nowrap shrink-0 cursor-pointer"
              >
                مواعيد العمل
              </button>
              <button
                type="button"
                onClick={() => sendChatMessage('كم سعر حشو أو تنظيف الأسنان؟')}
                className="px-2.5 py-1 text-[11px] font-medium bg-white border border-slate-200 rounded-md text-slate-700 hover:border-teal-600 whitespace-nowrap shrink-0 cursor-pointer"
              >
                الاستفسار عن الأسعار
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8FAFC]">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-teal-600 text-white'
                        : 'bg-white text-slate-800 border border-slate-200'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-slate-500 border border-slate-200 rounded-xl px-3.5 py-2 text-xs">
                    جاري كتابة الرد...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChatMessage();
              }}
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="اكتب سؤالك للمساعد الذكي..."
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>إرسال</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="px-4 py-3 text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-full shadow-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>المساعد الذكي لعيادة الرضوى</span>
          </button>
        )}
      </div>
    </div>
  );
}
