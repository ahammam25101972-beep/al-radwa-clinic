import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_INSTRUCTION =
  'أنت مساعد افتراضي لعيادة الرضوى لطب الأسنان تحت إشراف الدكتور محمد الشربيني (أخصائي طب وجراحة وتجميل الأسنان). مواعيد العمل من السبت للخميس من 12 ظهراً حتى 10 مساءً. إذا سُئلت عن الأسعار، أخبر المريض أن السعر يحدد بعد الكشف الطبي في العيادة، ووجهه لحجز موعد من خلال النموذج المتاح. خدمات العيادة تشمل: كشف، حشو، خلع، تنظيف، تركيبات، وتقويم الأسنان. تحدث باللغة العربية بأسلوب طبي مهذب ومختصر وواضح.';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // Check if permanent assets exist on disk
  app.get('/api/assets-status', (_req, res) => {
    const doctorPath = path.join(__dirname, 'public', 'assets', 'doctor-mohamed.jpg');
    const logoPath = path.join(__dirname, 'public', 'assets', 'clinic-logo.jpg');
    res.json({
      hasDoctorPhoto: fs.existsSync(doctorPath),
      hasClinicLogo: fs.existsSync(logoPath),
    });
  });

  // Save uploaded image permanently to /public/assets/ on disk
  app.post('/api/save-asset', (req, res) => {
    try {
      const { type, dataUrl } = req.body as {
        type?: 'doctor' | 'logo';
        dataUrl?: string;
      };

      if (!type || !dataUrl || !dataUrl.startsWith('data:image/')) {
        res.status(400).json({ error: 'بيانات الصورة غير صالحة.' });
        return;
      }

      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const assetsDir = path.join(__dirname, 'public', 'assets');
      fs.mkdirSync(assetsDir, { recursive: true });

      const fileName = type === 'doctor' ? 'doctor-mohamed.jpg' : 'clinic-logo.jpg';
      const targetPath = path.join(assetsDir, fileName);
      fs.writeFileSync(targetPath, buffer);

      res.json({
        success: true,
        url: `/assets/${fileName}?t=${Date.now()}`,
      });
    } catch (error) {
      console.error('Error saving asset:', error);
      res.status(500).json({ error: 'تعذر حفظ الصورة في ملفات المشروع.' });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history } = req.body as {
        message?: string;
        history?: Array<{ role: 'user' | 'model'; text: string }>;
      };

      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'يرجى كتابة رسالتك أولاً.' });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          error: 'مفتاح GEMINI_API_KEY غير متوفر في إعدادات الخادم (Settings > Secrets).',
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const formattedContents = Array.isArray(history)
        ? [
            ...history.slice(-10).map((item) => ({
              role: item.role === 'model' ? 'model' : 'user',
              parts: [{ text: String(item.text || '') }],
            })),
            {
              role: 'user',
              parts: [{ text: message.trim() }],
            },
          ]
        : message.trim();

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: formattedContents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const replyText =
        response.text ||
        'أهلاً بك في عيادة الرضوى لطب الأسنان. كيف يمكنني مساعدتك اليوم؟';

      res.json({ reply: replyText });
    } catch (error: unknown) {
      console.error('Gemini API Error:', error);
      const errMessage =
        error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء الاتصال بالمساعد الذكي.';
      res.status(500).json({
        error: errMessage,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Al-Radwa Dental Clinic server running on http://localhost:${PORT}`);
  });
}

startServer();
