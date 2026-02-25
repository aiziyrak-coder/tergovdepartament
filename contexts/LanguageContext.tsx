import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AppLanguage } from "../types";

const LANGUAGE_STORAGE_KEY = "TERGOV_AI_LANG";

function loadStoredLanguage(): AppLanguage {
  if (typeof localStorage === "undefined") return AppLanguage.UZ_CYRL;
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && Object.values(AppLanguage).includes(stored as AppLanguage)) return stored as AppLanguage;
  } catch {
    // ignore
  }
  return AppLanguage.UZ_CYRL;
}

// --- TRANSLATION DICTIONARY ---
const translations = {
  [AppLanguage.UZ_CYRL]: {
    // Sidebar
    dashboard: "Таҳлил Маркази",
    documents: "Ягона Архив",
    stenogram: "Стенограмма",
    protocol: "Сўроқ",
    photorobot: "Фоторобот",
    mentor: "Мураббий",
    legal_search: "Юридик Қидирув",
    templates: "Намуналар",
    settings: "Тизим Созламалари",
    footer_rights: "Барча ҳуқуқлар ҳимояланган",
    dev_by: "Ишлаб чиқарувчи",
    powered_by: "Қўллаб-қувватловчи",
    
    // Tab Labels for Sidebar (using t() function)
    tab_dashboard: "Таҳлил Маркази",
    tab_protocol: "Сўроқ",
    tab_stenogram: "Стенограмма",
    tab_accident: "Экспертиза",
    tab_photorobot: "Фоторобот",
    tab_templates: "Намуналар",
    tab_mentor: "Мураббий",
    tab_documents: "Ягона Архив",
    
    // Navigation
    nav_main_systems: "Асосий Тизимлар",
    nav_settings: "Созламалар",
    
    // Sidebar Sub Labels
    sub_dashboard: "Бошқарув",
    sub_protocol: "Баённома",
    sub_audio: "Аудио",
    sub_video: "Видео",
    sub_face: "Қиёфа",
    sub_template: "Шаблон",
    sub_help: "Ёрдам",
    sub_data: "Маълумот",
    sub_accident: "Экспертиза",
    
    // Dashboard Sections
    sec_docs_title: "Тезкор Ҳужжатлаштириш",
    sec_docs_sub: "Жараённи Автоматлаштириш",
    sec_forensic_title: "Криминалистик Лаборатория",
    sec_forensic_sub: "Суд Экспертизаси",
    sec_intel_title: "Интеллектуал Таҳлил",
    sec_intel_sub: "Стратегик Разведка",

    // Dashboard Cards
    card_doc_archive: "Ҳужжатлар Архиви",
    card_doc_desc: "Барча сақланган ишлар, баённомалар ва медиа файллар ягона ҳимояланган базаси.",
    card_steno_title: "Стенограмма",
    card_steno_desc: "Сўроқ жараёнини реал вақтда матнга айлантириш ва психологик таҳлил қилиш.",
    card_protocol_title: "Сўроқ",
    card_protocol_desc: "Тергов ҳаракатлари баённомаларини ЖПК талаблари асосида автоматик шакллантириш.",
    card_photo_title: "Фоторобот",
    card_photo_desc: "Гувоҳ кўрсатмалари асосида гумонланувчи қиёфасини сунъий интеллект ёрдамида тиклаш.",
    card_mentor_title: "Виртуал Мураббий",
    card_mentor_desc: "Тергов тактикаси ва стратегияси бўйича реал вақт режимидаги маслаҳатчи.",
    card_lex_title: "Юридик Қидирув",
    card_lex_desc: "Катта ҳажмдаги қонунчилик ва суд амалиёти базасидан интеллектуал қидирув.",

    // Login
    login_title: "Тизимга Кириш",
    login_dept: "Тергов Департаменти",
    login_region: "Фарғона вилояти",
    login_subtitle: "Шахсий Таъйинотнома Маълумотлари",
    login_username: "Фойдаланувчи (ID)",
    login_password: "Парол",
    login_show_pass: "Паролни Кўрсатиш",
    login_hide_pass: "Паролни Йўқотиш",
    login_button: "Тизимга Кириш",
    login_error_empty: "Барча майдонларни тўлдиринг.",
    login_error_invalid: "Логин ёки парол нотўғри. Қолган уриниш:",
    login_lockout: "Кириш вақтинча чекланган. 10 дақиқадан кейин қайта уриниб кўринг ёки тизим администратори билан муҳокама қилинг.",
    login_caps_warning: "CapsLock ёқилган",
    login_step_1: "Сервер билан ҳимояланган алоқа ўрнатилмоқда...",
    login_step_2: "Фойдаланувчи маълумотлари шифрланмоқда...",
    login_step_3: "Биометрик идентификация маълумотлари текширилмоқда...",
    login_step_4: "Кирішга рухсат берилди.",
    
    // General
    system_active: "Тизим Фаол",
    dept_name: "Ўзбекистон Республикаси Тергов Департаменти",
    welcome: "Хуш келибсиз",
    rank: "Подполковник",
    role: "Терговчи",
    back: "Орқага",
    save: "Сақлаш",
    cancel: "Бекор Қилиш",
    delete: "Ўчириш",
    edit: "Таҳрир",
    search: "Қидирув",
    
    // Documents
    doc_archive: "Архив",
    doc_search: "Қидирув...",
    doc_empty: "Ҳузирча ҳужжатлар йўқ",
    doc_empty_suggest: "Стенограмма, протокол ёки бошқа модулярдан сақланг.",
    doc_no_results: "Қидирув бўйича натижа топилмади",
    doc_try_again: "Бошқа сўз билан қидиринг.",
    doc_delete_title: "Ҳужжатни Ўчириш",
    doc_delete_msg: "Ушбу ҳужжат архивдан бутунлай ўчирилади. Қайтариб бўлмайди. Давом этасизми?",
    doc_delete_confirm: "Ўчириш",
    doc_deleted: "Ҳужжат ўчирилди",
    
    // Stenogram
    steno_upload: "Юклаш",
    steno_doc: "Ҳужжат",
    steno_audio: "Аудио",
    steno_file: "Аудио Файл",
    steno_upload_file: "Файл Юқлаш",
    steno_processing: "Қўллаб-қувватлов...",
    steno_transcribe: "Транскрибция Қилиш",
    steno_speakers: "Гапирувчилар",
    steno_add_speaker: "Гапирувчи Қўшиш",
    steno_speaker_name: "Гапирувчи Номи",
    steno_delete_segment: "Сегменни Ўчириш",
    steno_loading: "Аудио қўллаб-қувватлов...",
    steno_large_file: "Файл ҳажми жуда катта! Максимал 25 МБ.",
    steno_file_loaded: "Аудио файл юкланди.",
    
    // Protocol
    protocol_title: "Сўроқ Баённомаси",
    protocol_type: "Баённома Тури",
    protocol_witness: "Гувоҳни Сўроқ қилиш",
    protocol_victim: "Жабрланувчини Сўроқ қилиш",
    protocol_suspect: "Гумон қилинувчини Сўроқ қилиш",
    protocol_accused: "Айбланувчини Сўроқ қилиш",
    protocol_confrontation: "Юзлаштириш Баённомаси",
    protocol_language: "Тил",
    protocol_start: "Бошлаш",
    protocol_stop: "Ток қилиш",
    protocol_recording: "Сўроқ Қўллаб-қувватлов...",
    
    // PhotoRobot
    photo_human: "Инсон",
    photo_object: "Объект",
    photo_parametric: "Параметрик Метод",
    photo_narrative: "Нарратив Метод",
    photo_api_key: "Google Gemini API Калити",
    photo_generate: "Расм Яратиш",
    photo_variants: "Вариантлар",
    photo_select: "Танлаш",
    photo_edit: "Таҳрир қилиш",
    photo_confirm: "Тасдиқлаш",
    
    // Virtual Mentor
    mentor_chat: "Муҳокама",
    mentor_academy: "Академия",
    mentor_library: "Кутубхона",
    mentor_ask: "Сўроқ қўйиш...",
    mentor_courses: "Курслар",
    mentor_quiz: "Сўзсизқ",
    mentor_legal_db: "Қонун Базаси",
    mentor_search_legal: "Қонунчилик Қидирув...",
    
    // Settings
    settings_title: "Тизим Созламалари",
    settings_language: "Тил танланг",
    settings_api_key: "Google Gemini API Калити",
    settings_api_help: "API калитни қайта яратиш ёки тасдиқлаш",
    settings_data: "Маълумотлар",
    settings_clear: "Бўлимончасини Тўхтатиш",
    settings_export: "Экспорт Қилиш",
    settings_import: "Импорт қилиш",
    
    // Notifications
    notif_new_task: "Янги Топшириқ",
    notif_deadline: "Муддати оз қолди",
    notif_system: "Тизим Янгиланди",
    
    // General Messages
    msg_success: "Муваффақиятли",
    msg_error: "Хато",
    msg_loading: "Юқламаяпти...",
    msg_confirm: "Тасдиқлаш",
    msg_yes: "Ҳа",
    msg_no: "Йўқ",
  },
  [AppLanguage.UZ_LATN]: {
    // Sidebar
    dashboard: "Boshqaruv Paneli",
    documents: "Hujjatlar Arxivi",
    stenogram: "Stenogramma",
    protocol: "So'roq",
    photorobot: "Fotorobot",
    mentor: "Virtual Ustoz",
    legal_search: "Yuridik Qidiruv",
    templates: "Tezkor Namunalar",
    settings: "Tizim Sozlamalari",
    footer_rights: "Barcha huquqlar himoyalangan",
    dev_by: "Ishlab chiqaruvchi",
    powered_by: "Q'llab-quvvatlovchi",

    // Dashboard Sections
    sec_docs_title: "Tezkor Hujjatlashtirish",
    sec_docs_sub: "Jarayonni Avtomatlashtirish",
    sec_forensic_title: "Kriminalistik Laboratoriya",
    sec_forensic_sub: "Sud Ekspertizasi",
    sec_intel_title: "Intellektual Tahlil",
    sec_intel_sub: "Strategik Razvedka",

    // Dashboard Cards
    card_doc_archive: "Hujjatlar Arxivi",
    card_doc_desc: "Barcha saqlangan ishlar, bayonnomalar va media fayllar yagona himoyalangan bazasi.",
    card_steno_title: "Stenogramma",
    card_steno_desc: "So'roq jarayonini real vaqtda matnga aylantirish va psixologik tahlil qilish.",
    card_protocol_title: "So'roq",
    card_protocol_desc: "Tergov harakatlari bayonnomalarini JPK talablari asosida avtomatik shakllantirish.",
    card_photo_title: "Fotorobot",
    card_photo_desc: "Guvoh ko'rsatmalari asosida gumonlanuvchi qiyofasini sun'iy intellekt yordamida tiklash.",
    card_mentor_title: "Virtual Ustoz",
    card_mentor_desc: "Tergov taktikasi va strategiyasi bo'yicha real vaqt rejimidagi maslahatchi.",
    card_lex_title: "Yuridik Qidiruv (Lex.uz)",
    card_lex_desc: "Katta hajmdagi qonunchilik va sud amaliyoti bazasidan intellektual qidiruv.",

    // General
    system_active: "Tizim Faol",
    dept_name: "O'zbekiston Respublikasi Tergov Departamenti",
    welcome: "Xush kelibsiz",
    rank: "Podpolkovnik",
    role: "Tergovchi"
  },
  [AppLanguage.RU]: {
    // Sidebar
    dashboard: "Панель Управления",
    documents: "Архив Документов",
    stenogram: "Стенограмма",
    protocol: "Допрос",
    photorobot: "Фоторобот",
    mentor: "Виртуальный Наставник",
    legal_search: "Юридический Поиск",
    templates: "Шаблоны Документов",
    settings: "Настройки Системы",
    footer_rights: "Все права защищены",
    dev_by: "Разработчик",
    powered_by: "При поддержке",

    // Dashboard Sections
    sec_docs_title: "Оперативное Документирование",
    sec_docs_sub: "Автоматизация Процессов",
    sec_forensic_title: "Криминалистическая Лаборатория",
    sec_forensic_sub: "Судебная Экспертиза",
    sec_intel_title: "Интеллектуальный Анализ",
    sec_intel_sub: "Стратегическая Разведка",

    // Dashboard Cards
    card_doc_archive: "Архив Документов",
    card_doc_desc: "Единая защищенная база всех сохраненных дел, протоколов и медиафайлов.",
    card_steno_title: "Стенограмма",
    card_steno_desc: "Преобразование речи в текст в реальном времени и психологический анализ.",
    card_protocol_title: "Допрос",
    card_protocol_desc: "Автоматическое формирование протоколов следственных действий на основе УПК.",
    card_photo_title: "Фоторобот",
    card_photo_desc: "Восстановление облика подозреваемого на основе показаний свидетелей с помощью ИИ.",
    card_mentor_title: "Виртуальный Наставник",
    card_mentor_desc: "Советник в реальном времени по тактике и стратегии расследования.",
    card_lex_title: "Юридический Поиск (Lex.uz)",
    card_lex_desc: "Интеллектуальный поиск по базе законодательства и судебной практики.",

    // General
    system_active: "Система Активна",
    dept_name: "Следственный Департамент Республики Узбекистан",
    welcome: "Добро пожаловать",
    rank: "Подполковник",
    role: "Следователь"
  },
  [AppLanguage.EN]: {
    // Sidebar
    dashboard: "Dashboard",
    documents: "Document Archive",
    stenogram: "Stenogram",
    protocol: "Interrogation",
    photorobot: "Photorobot",
    mentor: "Virtual Mentor",
    legal_search: "Legal Search",
    templates: "Quick Templates",
    settings: "System Settings",
    footer_rights: "All rights reserved",
    dev_by: "Developed by",
    powered_by: "Powered by",

    // Dashboard Sections
    sec_docs_title: "Rapid Documentation",
    sec_docs_sub: "Process Automation",
    sec_forensic_title: "Forensic Laboratory",
    sec_forensic_sub: "Forensic Science",
    sec_intel_title: "Intelligence Analysis",
    sec_intel_sub: "Strategic Intelligence",

    // Dashboard Cards
    card_doc_archive: "Document Archive",
    card_doc_desc: "Unified secure database of all saved cases, protocols, and media files.",
    card_steno_title: "Stenogram",
    card_steno_desc: "Real-time speech-to-text conversion and psychological analysis.",
    card_protocol_title: "Interrogation",
    card_protocol_desc: "Automatic generation of investigative protocols based on CPC requirements.",
    card_photo_title: "Photorobot",
    card_photo_desc: "AI-assisted reconstruction of suspect's appearance based on witness descriptions.",
    card_mentor_title: "Virtual Mentor",
    card_mentor_desc: "Real-time advisor on investigation tactics and strategy.",
    card_lex_title: "Legal Search (Lex.uz)",
    card_lex_desc: "Intelligent search through legislation and judicial practice database.",

    // General
    system_active: "System Active",
    dept_name: "Investigation Department of the Republic of Uzbekistan",
    welcome: "Welcome",
    rank: "Colonel",
    role: "Investigator"
  }
};

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => loadStoredLanguage());

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // ignore quota / private mode
    }
  }, [language]);

  const setLanguage = (lang: AppLanguage) => setLanguageState(lang);

  const t = (key: string): string => {
    const dict = translations[language];
    if (key in dict) return (dict as Record<string, string>)[key];
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
