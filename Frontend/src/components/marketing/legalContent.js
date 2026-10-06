// Text of the Terms of Service and Privacy Policy (plain data, usable from
// server components, the /terms and /privacy pages and the sign-up pop-up).
//
// Structured like the policies large services publish, written in plain
// language for farmers. Each section is [title, body]; a body is a string,
// or a list whose items are paragraphs, or bullet points when they start
// with "• ". Written for India (IT Act 2000, DPDP Act 2023).
// Have these reviewed by a lawyer before launch.

export const UPDATED = '28 September 2026';

export const TERMS = {
  crumb: 'Terms of Service',
  eyebrow: 'Legal',
  title: ['Terms of', 'Service', ''],
  lead: 'The agreement between you and FarmXpert when you create an account and use the website, the app, the assistant and the dashboard.',
  summary: [
    'FarmXpert gives farm advice from your own data; use it together with your own judgement.',
    'Keep your password and one-time codes private; you are responsible for your account.',
    'Use the service fairly: daily AI allowances keep it affordable for everyone.',
    'Your farm data stays yours; you allow us to use it only to run FarmXpert for you.',
  ],
  sections: [
    ['About these terms', [
      'These Terms of Service ("Terms") are an agreement between you and FarmXpert ("FarmXpert", "we", "us"). By creating an account or using FarmXpert you accept these Terms and our Privacy Policy. If you do not agree, please do not use the service.',
      '"Service" means the FarmXpert website, the web app, the assistant (typed and voice), the dashboard, daily plans, reports and any connected sensor features.',
    ]],
    ['Who can use FarmXpert', [
      '• You must be at least 18 years old, or use FarmXpert with the permission and supervision of a parent or guardian.',
      '• You must give true information about yourself and your farm, and keep it up to date.',
      '• One person, one account. You may not create accounts for others without their permission.',
    ]],
    ['Your account and security', [
      'You need a verified email address to create an account. Keep your password and one-time codes private; you are responsible for activity on your account. Tell us at once at support@farmxpert.in if you think someone else has used it. We may ask you to verify your identity before we make changes to your account.',
    ]],
    ['What FarmXpert provides', [
      'FarmXpert answers questions about your own farm in your language, using your farm details, soil readings, weather forecasts and market prices, and prepares daily plans and irrigation, soil, crop and market advice. We may add, change or remove features to improve the service.',
    ]],
    ['Advice, not a guarantee', [
      'FarmXpert gives guidance based on the data it has and on models that can be wrong. Weather, soil, pests and markets change, and conditions on your field may differ from the data.',
      '• Use the advice together with your own judgement and, for important decisions (sprays, large purchases, sowing), a local agriculture officer or expert.',
      '• Follow the label and local rules for any fertiliser, pesticide or equipment.',
      '• FarmXpert is not a substitute for professional, legal or financial advice.',
    ]],
    ['Your content and farm data', [
      'You keep ownership of the information you give us: your farm details, sensor readings and questions. You allow FarmXpert to store and process it only to provide and improve the service for you, as described in our Privacy Policy. We do not sell your data.',
    ]],
    ['Acceptable use', [
      'Please do not:',
      '• break any law, or use FarmXpert to harm others;',
      '• try to access other accounts, data or systems, or test or break our security;',
      '• scrape, copy or resell the service, or use automated tools to overload it;',
      '• upload harmful code, or content that is abusive, misleading or infringes others\' rights.',
    ]],
    ['Fair use and allowances', [
      'Each account has a daily AI allowance (typed and voice) so the service stays affordable for everyone. When you reach it, the assistant resumes the next day. We may adjust allowances to keep the service reliable.',
    ]],
    ['Sensors and third-party services', [
      'If you connect a soil probe (for example Blynk), you allow FarmXpert to read it on your behalf. FarmXpert also relies on third parties for AI, weather, market prices, email and hosting. Their availability can change, and their own terms may apply to them. We are not responsible for devices or services we do not control.',
    ]],
    ['Intellectual property', [
      'The FarmXpert name, logo, design, software and content belong to FarmXpert or its licensors. We give you a personal, non-transferable right to use the service for your farming. You may not copy, modify or reuse them except as these Terms allow.',
    ]],
    ['Disclaimers', [
      'The service is provided "as is" and "as available". To the extent the law allows, we do not promise that it will be uninterrupted, error-free, or that its advice will produce any particular result.',
    ]],
    ['Limitation of liability', [
      'To the extent the law allows, FarmXpert is not liable for indirect or consequential losses, including loss of crops, income, profit or data, arising from your use of the service or from acting on its advice. Nothing in these Terms limits liability that cannot be limited under the law of India.',
    ]],
    ['Suspending or ending an account', [
      'You can stop using FarmXpert at any time and ask us to close your account. We may suspend or close an account that breaks these Terms, misuses the service or puts others at risk. When an account is closed it can no longer be used; some records are kept as described in the Privacy Policy.',
    ]],
    ['Changes to these terms', [
      'We may update these Terms. We will change the "Last updated" date and, for important changes, tell you in the app or by email before they apply. Continuing to use FarmXpert after that means you accept the updated Terms.',
    ]],
    ['Governing law and disputes', [
      'These Terms are governed by the laws of India. We will try to resolve any complaint with you first; please write to us. Disputes that cannot be resolved are subject to the jurisdiction of the courts of Gujarat, India.',
    ]],
    ['Contact and grievances', [
      'Questions or complaints about the service: support@farmxpert.in. We aim to acknowledge complaints within 24 hours and resolve them within 15 days, in line with the Information Technology Rules, 2021.',
    ]],
  ],
};

export const PRIVACY = {
  crumb: 'Privacy Policy',
  eyebrow: 'Legal',
  title: ['Privacy', 'Policy', ''],
  lead: 'What FarmXpert collects, why, who can see it, how long we keep it, and the choices and rights you have.',
  summary: [
    'We collect only what is needed to advise you on your own farm.',
    'Voice recordings are not stored, and we never sell your data.',
    'Only you see your farm and chats; a few operators see account and usage data to run the service.',
    'You can see, correct or delete your data, or withdraw consent, at any time.',
  ],
  sections: [
    ['Who we are', [
      'FarmXpert ("we", "us") is the data fiduciary for the personal data described here, under India\'s Digital Personal Data Protection Act, 2023. This policy explains how we handle your data when you use the FarmXpert website, app and assistant.',
    ]],
    ['What we collect', [
      '• Account details: your name, email address and, if you give it, your mobile number.',
      '• Farm details: location, area, crops and growth stage, soil type, water source and resources you share.',
      '• Sensor readings: data from a soil probe you connect (moisture, temperature, EC, pH, N-P-K).',
      '• Conversations: the questions you type, the text of what you say by voice, and the answers.',
      '• Usage and device data: sign-in times, the language you use, AI usage counts, and basic technical logs.',
    ]],
    ['How we use your data', [
      '• To answer your questions about your own farm and prepare your daily plan and advice.',
      '• To keep your account secure (verification codes, sign-in protection, fraud prevention).',
      '• To run fair daily allowances and keep AI costs in check.',
      '• To fix problems and improve FarmXpert, using aggregated or de-identified data where we can.',
      '• To send you account emails (codes, password resets, important service changes).',
    ]],
    ['Legal basis', [
      'We process your data with your consent, which you give when you create an account, and for the legitimate uses the law allows, such as keeping the service secure and meeting legal obligations. You can withdraw consent at any time; this does not affect processing already done.',
    ]],
    ['Voice recordings', [
      'When you speak to FarmXpert, the recording is sent for transcription and is not stored. Only the text of what you said is kept with your chat, so you can read it later.',
    ]],
    ['Who can see your data', [
      '• You: your farm, readings and chats are visible only to you in the app.',
      '• FarmXpert operators: a small number of authorised staff can see account and usage information to run and support the service.',
      '• Service providers: AI, speech, weather, email and hosting providers process data only to deliver their part of the service, under contract and our instructions.',
      '• The law: we may share data when required by law or to protect people\'s safety.',
      'We do not sell your personal data or use it for third-party advertising.',
    ]],
    ['Where data is processed', [
      'Our servers and some providers may process data outside India. When they do, we take steps so your data is protected to the standard this policy describes and as Indian law requires.',
    ]],
    ['How long we keep it', [
      'We keep your data while your account is open. When you close your account it can no longer be used; we keep records we must retain for security, accounting or legal reasons for as long as the law requires, and delete or anonymise the rest.',
    ]],
    ['How we protect it', [
      'Passwords are stored as secure hashes, sign-in sessions expire and rotate, codes are single-use and time-limited, and access to data is restricted to people who need it. No system is perfectly secure; if we learn of a breach that affects you, we will tell you and the authorities as the law requires.',
    ]],
    ['Your rights', [
      'Under the Digital Personal Data Protection Act, 2023 you can:',
      '• ask what data we hold about you and how it is used;',
      '• correct, complete or update your data (much of it directly in Settings);',
      '• ask us to delete your data or close your account;',
      '• withdraw consent at any time;',
      '• nominate a person to exercise these rights for you;',
      '• raise a grievance with us, and then with the Data Protection Board of India.',
    ]],
    ['Children', [
      'FarmXpert is for adults. Anyone under 18 should use it only with a parent or guardian, who gives consent on their behalf. We do not knowingly collect children\'s data without that consent.',
    ]],
    ['Cookies and local storage', [
      'We use a small number of cookies and browser storage items that FarmXpert needs to work: keeping you signed in, remembering your language and light or dark theme, and security. We do not use advertising cookies.',
    ]],
    ['Changes to this policy', [
      'We may update this policy. We will change the "Last updated" date and, for important changes, tell you in the app or by email before they apply.',
    ]],
    ['Contact and grievance officer', [
      'For privacy questions, requests or complaints, write to support@farmxpert.in with the subject "Privacy". We aim to acknowledge requests within 24 hours and respond within 15 days.',
    ]],
  ],
};

// ── languages ───────────────────────────────────────────────────────────────
// The document and the labels around it, in the visitor's language. English
// is the reference version; Hindi and Gujarati follow the same structure.

import { PRIVACY_GU, TERMS_GU } from './legalContent.gu';
import { PRIVACY_HI, TERMS_HI } from './legalContent.hi';

const UPDATED_BY = { en: UPDATED, hi: '28 सितंबर 2026', gu: '28 સપ્ટેમ્બર 2026' };

const UI = {
  en: {
    home: 'Home', onPage: 'On this page', inShort: 'In short', updated: 'Effective and last updated', print: 'Print or save as PDF',
    top: 'Back to top', read: 'Read the', note: 'These pages explain in plain language how FarmXpert works. If anything here is unclear, write to',
    lastUpdated: 'Last updated',
  },
  hi: {
    home: 'होम', onPage: 'इस पेज पर', inShort: 'संक्षेप में', updated: 'प्रभावी और अंतिम अद्यतन', print: 'प्रिंट करें या PDF सहेजें',
    top: 'ऊपर जाएँ', read: 'पढ़ें:', note: 'ये पेज सरल भाषा में बताते हैं कि FarmXpert कैसे काम करता है। कुछ भी स्पष्ट न हो तो लिखें:',
    lastUpdated: 'अंतिम अद्यतन',
  },
  gu: {
    home: 'હોમ', onPage: 'આ પેજ પર', inShort: 'ટૂંકમાં', updated: 'અમલી અને છેલ્લે અપડેટ', print: 'પ્રિન્ટ કરો અથવા PDF સાચવો',
    top: 'ઉપર જાઓ', read: 'વાંચો:', note: 'આ પેજ સરળ ભાષામાં સમજાવે છે કે FarmXpert કેવી રીતે કામ કરે છે. કંઈ સ્પષ્ટ ન હોય તો લખો:',
    lastUpdated: 'છેલ્લે અપડેટ',
  },
};

const DOCS = { en: { terms: TERMS, privacy: PRIVACY }, hi: { terms: TERMS_HI, privacy: PRIVACY_HI }, gu: { terms: TERMS_GU, privacy: PRIVACY_GU } };

/** { doc, other, ui, updated } for 'terms' | 'privacy' in the given language (English if unknown). */
export function legal(kind, locale) {
  const lang = DOCS[locale] ? locale : 'en';
  const otherKind = kind === 'terms' ? 'privacy' : 'terms';
  return {
    doc: DOCS[lang][kind],
    other: { href: `/${otherKind}`, label: DOCS[lang][otherKind].crumb },
    ui: UI[lang],
    updated: UPDATED_BY[lang],
  };
}
