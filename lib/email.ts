// lib/email.ts
import nodemailer from 'nodemailer';

// Create transporter with fallback for development
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify transporter in development only
if (process.env.NODE_ENV === 'development') {
  transporter.verify((error, success) => {
    if (error) {
      console.warn('⚠️ SMTP configuration warning (development mode):', error.message);
      console.warn('💡 Email sending will be simulated in development');
    } else {
      console.log('✅ SMTP server is ready to send emails');
    }
  });
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<void> {
  try {
    // ✅ Skip actual sending in development if SMTP not configured
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
      console.log('📧 [DEV MODE - Email Simulation]');
      console.log('📧 To:', to);
      console.log('📧 Subject:', subject);
      console.log('📧 Preview:', html.substring(0, 300) + '...');
      console.log('✅ Email simulated successfully (no actual send)');
      return; // Simulate success in dev
    }

    // ✅ Check for required SMTP config in production
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP credentials not configured');
    }

    await transporter.sendMail({
      from: `"MediCare" <${process.env.SMTP_FROM || 'noreply@midicare.com'}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });
    
    console.log('✅ Email sent successfully to:', to);
  } catch (error: any) {
    console.error('❌ Email send failed:', error);
    
    // ✅ In development, don't throw - just log
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Email failed in dev mode - continuing anyway');
      return;
    }
    
    // ✅ In production, throw so API can handle it
    throw new Error('Failed to send email');
  }
}

// Password reset email template
export function createPasswordResetEmail(locale: string, resetUrl: string, userName: string) {
  const translations: Record<string, any> = {
    en: {
      subject: 'Reset Your Password - MediCare',
      greeting: `Hello ${userName}`,
      title: 'Password Reset Request',
      message: 'You have requested to reset your password. Click the button below to set a new password:',
      button: 'Reset Password',
      warning: 'This link will expire in 1 hour.',
      ignore: 'If you did not request this, please ignore this email.',
      footer: '© 2025 MediCare. All rights reserved.',
    },
    fr: {
      subject: 'Réinitialiser votre mot de passe - MediCare',
      greeting: `Bonjour ${userName}`,
      title: 'Demande de réinitialisation de mot de passe',
      message: 'Vous avez demandé de réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe:',
      button: 'Réinitialiser le mot de passe',
      warning: 'Ce lien expirera dans 1 heure.',
      ignore: "Si vous n'avez pas demandé ceci, veuillez ignorer cet email.",
      footer: '© 2025 MediCare. Tous droits réservés.',
    },
    ar: {
      subject: 'إعادة تعيين كلمة المرور - حياتي',
      greeting: `مرحباً ${userName}`,
      title: 'طلب إعادة تعيين كلمة المرور',
      message: 'لقد طلبت إعادة تعيين كلمة المرور. انقر على الزر أدناه لتعيين كلمة مرور جديدة:',
      button: 'إعادة تعيين كلمة المرور',
      warning: 'ستنتهي صلاحية هذا الرابط خلال ساعة واحدة.',
      ignore: 'إذا لم تطلب هذا، يرجى تجاهل هذا البريد الإلكتروني.',
      footer: '© 2025 حياتي للرعاية. جميع الحقوق محفوظة.',
    },
  };

  const t = translations[locale] || translations.en;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  const html = `
<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: #f8f9fa; padding: 30px; border-radius: 10px; }
    .header { background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .button:hover { background: #1d4ed8; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
    @media (max-width: 600px) { .container { padding: 20px; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0; font-size:24px;">🏠 MediCare</h1>
    </div>
    <h2 style="color:#1f2937; margin-top:20px;">${t.title}</h2>
    <p style="color:#4b5563;">${t.greeting},</p>
    <p style="color:#4b5563;">${t.message}</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" class="button" style="color:white;">${t.button}</a>
    </p>
    <div class="warning">
      ⚠️ ${t.warning}
    </div>
    <p style="color:#6b7280; font-size:14px;">${t.ignore}</p>
    <div class="footer">
      ${t.footer}
    </div>
  </div>
</body>
</html>
  `;

  return {
    subject: t.subject,
    html,
  };
}