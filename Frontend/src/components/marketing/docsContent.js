// The FarmXpert guide (/docs): how to use the app, for farmers. Same shape as
// the legal documents: each section is [title, body]; a body is a list of
// paragraphs, with "• " lines shown as bullets. English, Hindi, Gujarati.

const EN = {
  crumb: 'Docs',
  eyebrow: 'Guide',
  title: ['FarmXpert', 'guide', ''],
  lead: 'Everything you need to set up your farm, ask good questions and get the most from your daily plan, sensor and market prices.',
  summary: [
    'Set up your farm once: location, crop, soil and water. Every answer then fits your own land.',
    'Ask by typing or by voice, in your own language.',
    'Open Today each morning for the plan; the Water, Soil and Mandi pages go deeper.',
  ],
  sections: [
    ['Getting started', [
      'Create an account with your email, confirm it with the 6-digit code we send, then set up your farm. Setup takes about five minutes.',
      '• Farm: name, location (use your phone\'s GPS or type latitude and longitude), area, state and district.',
      '• Field: the crop you are growing, its growth stage and sowing date.',
      '• Soil and water: soil type, water source and how you irrigate.',
      '• Resources: workers, equipment, budget and working hours, so plans fit what you have.',
      'You can skip optional steps and fill them in later from Settings.',
    ]],
    ['Asking questions', [
      'Open Ask and type your question as you would ask a friend who knows farming. FarmXpert answers from your farm\'s data: soil readings, weather, crop stage and mandi prices.',
      '• Be specific: "Should I water my cotton today?" works better than "water?".',
      '• Mention what you want: "I want to grow fruit" or "my budget is ₹20,000".',
      '• Choose one expert from the menu (weather, soil, water, crop, tasks, market) or let FarmXpert pick.',
      'Your chats are saved; open them again from the list under Ask.',
    ]],
    ['Voice', [
      'Tap the sound-wave button in Ask to talk hands-free. Speak naturally in Hindi, Gujarati, English or another Indian language; FarmXpert listens, answers on screen and reads the answer aloud.',
      '• Speak close to the phone in a quiet place.',
      '• Pause when you finish; FarmXpert sends your question on its own.',
      '• Recordings are not stored; only the text of what you said is kept with your chat.',
    ]],
    ['Your daily plan', [
      'The Today page brings together the weather, soil, irrigation and your tasks. Tap "Get today\'s plan" for a short, ordered list of what to do today and why. The plan is kept for the day, so it opens instantly.',
      'Tasks shows the week ahead; tick jobs off as you finish them.',
    ]],
    ['Soil sensor', [
      'If you have a Blynk soil probe, connect it in Settings with its auth token. FarmXpert reads moisture, soil temperature, EC, pH and N-P-K every 15 minutes and uses them in every answer.',
      '• Paste only the token, not the whole link.',
      '• Place the probe in the root zone, away from the drip emitter.',
      '• No probe? Enter your soil test values during setup; advice still works.',
    ]],
    ['Water, soil and mandi', [
      '• Water: when to irrigate and how much, adjusted for forecast rain.',
      '• Soil: the latest readings with a plain verdict on what is short or too high.',
      '• Mandi: 30 days of prices for your crop and the best nearby market, with a sell-or-hold suggestion.',
    ]],
    ['Account, language and theme', [
      'Change your name, mobile number, password and farm details in Settings. Switch language (English, हिन्दी, ગુજરાતી) and light or dark theme from the sidebar; your choice is remembered.',
      'Usage shows how much of your daily AI allowance you have used; it resets every day.',
    ]],
    ['Getting help', [
      'If something does not work or an answer looks wrong, write to us from the Contact page or at support@farmxpert.in. Tell us the page, what you did and what you expected.',
    ]],
  ],
};

const HI = {
  crumb: 'गाइड',
  eyebrow: 'मार्गदर्शिका',
  title: ['FarmXpert', 'गाइड', ''],
  lead: 'अपना खेत सेट करने, सही सवाल पूछने और रोज़ की योजना, सेंसर और मंडी भाव का पूरा लाभ लेने के लिए ज़रूरी सब कुछ।',
  summary: [
    'खेत एक बार सेट करें: स्थान, फसल, मिट्टी और पानी। उसके बाद हर जवाब आपकी अपनी ज़मीन के हिसाब से होगा।',
    'लिखकर या बोलकर, अपनी भाषा में पूछें।',
    'हर सुबह "आज" खोलें; पानी, मिट्टी और मंडी पेज और विस्तार से बताते हैं।',
  ],
  sections: [
    ['शुरुआत', [
      'अपने ईमेल से खाता बनाएँ, हमारे भेजे 6 अंकों के कोड से उसकी पुष्टि करें, फिर अपना खेत सेट करें। इसमें लगभग पाँच मिनट लगते हैं।',
      '• खेत: नाम, स्थान (फ़ोन का GPS या अक्षांश-देशांतर), क्षेत्रफल, राज्य और ज़िला।',
      '• खेत का हिस्सा: आप कौन-सी फसल उगा रहे हैं, उसकी अवस्था और बुवाई की तारीख।',
      '• मिट्टी और पानी: मिट्टी का प्रकार, पानी का स्रोत और सिंचाई का तरीका।',
      '• संसाधन: मज़दूर, उपकरण, बजट और काम के घंटे, ताकि योजना आपके साधनों के अनुसार बने।',
      'वैकल्पिक चरण छोड़ सकते हैं और बाद में सेटिंग्स से भर सकते हैं।',
    ]],
    ['सवाल पूछना', [
      '"पूछें" खोलें और सवाल वैसे लिखें जैसे खेती जानने वाले किसी मित्र से पूछते हैं। FarmXpert आपके खेत के डेटा से जवाब देता है: मिट्टी की रीडिंग, मौसम, फसल की अवस्था और मंडी भाव।',
      '• साफ़ पूछें: "क्या आज कपास को पानी दूँ?" "पानी?" से बेहतर है।',
      '• अपनी इच्छा बताएँ: "मुझे फल उगाने हैं" या "मेरा बजट ₹20,000 है"।',
      '• मेनू से एक विशेषज्ञ चुनें (मौसम, मिट्टी, पानी, फसल, काम, बाज़ार) या FarmXpert को चुनने दें।',
      'आपकी बातचीत सहेजी रहती है; "पूछें" के नीचे की सूची से उसे फिर खोलें।',
    ]],
    ['आवाज़', [
      'बिना हाथ लगाए बात करने के लिए "पूछें" में ध्वनि-तरंग वाला बटन दबाएँ। हिंदी, गुजराती, अंग्रेज़ी या किसी और भारतीय भाषा में सहज रूप से बोलें; FarmXpert सुनता है, स्क्रीन पर जवाब देता है और उसे पढ़कर सुनाता है।',
      '• शांत जगह पर फ़ोन के पास बोलें।',
      '• बात पूरी होने पर रुकें; FarmXpert सवाल अपने-आप भेज देता है।',
      '• रिकॉर्डिंग नहीं रखी जाती; केवल आपकी कही बात का लिखित रूप बातचीत के साथ रहता है।',
    ]],
    ['रोज़ की योजना', [
      '"आज" पेज मौसम, मिट्टी, सिंचाई और आपके कामों को एक साथ दिखाता है। "आज की योजना" दबाएँ और आज क्या करना है और क्यों, इसकी छोटी क्रमवार सूची पाएँ। योजना पूरे दिन रहती है, इसलिए तुरंत खुलती है।',
      '"काम" पेज आने वाला हफ़्ता दिखाता है; काम पूरा होने पर उस पर निशान लगाएँ।',
    ]],
    ['मिट्टी सेंसर', [
      'यदि आपके पास Blynk मिट्टी प्रोब है, तो उसे उसके ऑथ टोकन से सेटिंग्स में जोड़ें। FarmXpert हर 15 मिनट में नमी, मिट्टी का तापमान, EC, pH और N-P-K पढ़ता है और हर जवाब में उनका उपयोग करता है।',
      '• पूरा लिंक नहीं, केवल टोकन चिपकाएँ।',
      '• प्रोब को जड़ों के पास लगाएँ, ड्रिप की बूँद से दूर।',
      '• प्रोब नहीं है? सेटअप में मिट्टी जाँच के मान डालें; सलाह तब भी मिलेगी।',
    ]],
    ['पानी, मिट्टी और मंडी', [
      '• पानी: कब और कितनी सिंचाई करें, बारिश के पूर्वानुमान के अनुसार।',
      '• मिट्टी: ताज़ा रीडिंग और साफ़ निष्कर्ष कि क्या कम है या ज़्यादा।',
      '• मंडी: आपकी फसल के 30 दिनों के भाव और पास की सबसे अच्छी मंडी, बेचें या रुकें की सलाह के साथ।',
    ]],
    ['खाता, भाषा और थीम', [
      'नाम, मोबाइल नंबर, पासवर्ड और खेत की जानकारी सेटिंग्स में बदलें। भाषा (English, हिन्दी, ગુજરાતી) और लाइट या डार्क थीम साइडबार से बदलें; आपकी पसंद याद रहती है।',
      '"उपयोग" बताता है कि आपने रोज़ की AI सीमा का कितना हिस्सा उपयोग किया; यह हर दिन फिर से शुरू होती है।',
    ]],
    ['मदद पाना', [
      'कुछ काम न करे या कोई जवाब गलत लगे, तो "संपर्क" पेज से या support@farmxpert.in पर लिखें। बताएँ कि कौन-सा पेज, आपने क्या किया और क्या अपेक्षा थी।',
    ]],
  ],
};

const GU = {
  crumb: 'માર્ગદર્શિકા',
  eyebrow: 'માર્ગદર્શિકા',
  title: ['FarmXpert', 'માર્ગદર્શિકા', ''],
  lead: 'તમારું ખેતર સેટ કરવા, સાચા પ્રશ્નો પૂછવા અને રોજની યોજના, સેન્સર અને મંડી ભાવનો પૂરો લાભ લેવા જરૂરી બધું.',
  summary: [
    'ખેતર એક વાર સેટ કરો: સ્થાન, પાક, જમીન અને પાણી. પછી દરેક જવાબ તમારી પોતાની જમીન મુજબ હશે.',
    'લખીને કે બોલીને, તમારી ભાષામાં પૂછો.',
    'દરરોજ સવારે "આજ" ખોલો; પાણી, જમીન અને મંડી પેજ વધુ વિગત આપે છે.',
  ],
  sections: [
    ['શરૂઆત', [
      'તમારા ઇમેઇલથી ખાતું બનાવો, અમે મોકલેલા 6 અંકના કોડથી તેની પુષ્ટિ કરો, પછી તમારું ખેતર સેટ કરો. તેમાં લગભગ પાંચ મિનિટ લાગે છે.',
      '• ખેતર: નામ, સ્થાન (ફોનનું GPS કે અક્ષાંશ-રેખાંશ), વિસ્તાર, રાજ્ય અને જિલ્લો.',
      '• ખેતરનો ભાગ: તમે કયો પાક ઉગાડો છો, તેની અવસ્થા અને વાવણીની તારીખ.',
      '• જમીન અને પાણી: જમીનનો પ્રકાર, પાણીનો સ્રોત અને સિંચાઈની રીત.',
      '• સાધનો: મજૂરો, ઉપકરણો, બજેટ અને કામના કલાકો, જેથી યોજના તમારી પાસે જે છે તે મુજબ બને.',
      'વૈકલ્પિક પગલાં છોડી શકો છો અને પછીથી સેટિંગ્સમાંથી ભરી શકો છો.',
    ]],
    ['પ્રશ્નો પૂછવા', [
      '"પૂછો" ખોલો અને પ્રશ્ન એમ લખો જેમ ખેતી જાણતા મિત્રને પૂછો. FarmXpert તમારા ખેતરના ડેટાથી જવાબ આપે છે: જમીનના રીડિંગ, હવામાન, પાકની અવસ્થા અને મંડી ભાવ.',
      '• સ્પષ્ટ પૂછો: "શું આજે કપાસને પાણી આપું?" એ "પાણી?" કરતાં સારું છે.',
      '• તમારી ઇચ્છા જણાવો: "મારે ફળ ઉગાડવાં છે" અથવા "મારું બજેટ ₹20,000 છે".',
      '• મેનૂમાંથી એક નિષ્ણાત પસંદ કરો (હવામાન, જમીન, પાણી, પાક, કામ, બજાર) અથવા FarmXpert ને પસંદ કરવા દો.',
      'તમારી વાતચીત સચવાયેલી રહે છે; "પૂછો" નીચેની યાદીમાંથી તેને ફરી ખોલો.',
    ]],
    ['અવાજ', [
      'હાથ વગર વાત કરવા "પૂછો" માં ધ્વનિ-તરંગવાળું બટન દબાવો. ગુજરાતી, હિન્દી, અંગ્રેજી કે બીજી ભારતીય ભાષામાં સહજ રીતે બોલો; FarmXpert સાંભળે છે, સ્ક્રીન પર જવાબ આપે છે અને તે વાંચીને સંભળાવે છે.',
      '• શાંત જગ્યાએ ફોનની નજીક બોલો.',
      '• વાત પૂરી થાય ત્યારે અટકો; FarmXpert પ્રશ્ન જાતે મોકલી દે છે.',
      '• રેકોર્ડિંગ રાખવામાં આવતું નથી; ફક્ત તમે કહેલી વાતનું લખાણ વાતચીત સાથે રહે છે.',
    ]],
    ['રોજની યોજના', [
      '"આજ" પેજ હવામાન, જમીન, સિંચાઈ અને તમારાં કામ એકસાથે બતાવે છે. "આજની યોજના" દબાવો અને આજે શું કરવું અને શા માટે, તેની ટૂંકી ક્રમવાર યાદી મેળવો. યોજના આખો દિવસ રહે છે, એટલે તરત ખૂલે છે.',
      '"કામ" પેજ આવતું અઠવાડિયું બતાવે છે; કામ પૂરું થાય ત્યારે તેના પર નિશાન કરો.',
    ]],
    ['જમીન સેન્સર', [
      'જો તમારી પાસે Blynk જમીન પ્રોબ હોય, તો તેના ઓથ ટોકનથી સેટિંગ્સમાં જોડો. FarmXpert દર 15 મિનિટે ભેજ, જમીનનું તાપમાન, EC, pH અને N-P-K વાંચે છે અને દરેક જવાબમાં તેનો ઉપયોગ કરે છે.',
      '• આખી લિંક નહીં, ફક્ત ટોકન ચોંટાડો.',
      '• પ્રોબ મૂળ પાસે લગાવો, ડ્રિપના ટીપાથી દૂર.',
      '• પ્રોબ નથી? સેટઅપમાં જમીન ચકાસણીનાં મૂલ્ય ભરો; સલાહ ત્યારે પણ મળશે.',
    ]],
    ['પાણી, જમીન અને મંડી', [
      '• પાણી: ક્યારે અને કેટલી સિંચાઈ કરવી, વરસાદની આગાહી મુજબ.',
      '• જમીન: તાજા રીડિંગ અને સ્પષ્ટ તારણ કે શું ઓછું કે વધુ છે.',
      '• મંડી: તમારા પાકના 30 દિવસના ભાવ અને નજીકની શ્રેષ્ઠ મંડી, વેચો કે રાહ જુઓ ની સલાહ સાથે.',
    ]],
    ['ખાતું, ભાષા અને થીમ', [
      'નામ, મોબાઇલ નંબર, પાસવર્ડ અને ખેતરની માહિતી સેટિંગ્સમાં બદલો. ભાષા (English, हिन्दी, ગુજરાતી) અને લાઇટ કે ડાર્ક થીમ સાઇડબારમાંથી બદલો; તમારી પસંદ યાદ રહે છે.',
      '"ઉપયોગ" બતાવે છે કે તમે રોજની AI મર્યાદાનો કેટલો ભાગ વાપર્યો; તે દરરોજ ફરી શરૂ થાય છે.',
    ]],
    ['મદદ મેળવવી', [
      'કંઈ કામ ન કરે કે કોઈ જવાબ ખોટો લાગે, તો "સંપર્ક" પેજથી કે support@farmxpert.in પર લખો. જણાવો કે કયું પેજ, તમે શું કર્યું અને શું અપેક્ષા હતી.',
    ]],
  ],
};

const BY = { en: EN, hi: HI, gu: GU };
export const docs = (locale) => BY[locale] || EN;
