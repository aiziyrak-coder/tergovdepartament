import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AppLanguage } from "../types";

const LANGUAGE_STORAGE_KEY = "TERGOV_AI_LANG";

function loadStoredLanguage(): AppLanguage {
  return AppLanguage.UZ_CYRL;
}

// --- TRANSLATION DICTIONARY (Uzbek Cyrillic only) ---
const UZ_CYRL_DICT = {
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
};

const translations: Record<AppLanguage, typeof UZ_CYRL_DICT> = {
  [AppLanguage.UZ_CYRL]: UZ_CYRL_DICT,
  [AppLanguage.UZ_LATN]: UZ_CYRL_DICT,
  [AppLanguage.RU]: UZ_CYRL_DICT,
  [AppLanguage.EN]: UZ_CYRL_DICT,
};

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(AppLanguage.UZ_CYRL);

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, AppLanguage.UZ_CYRL);
    } catch {
      // ignore quota / private mode
    }
  }, [language]);

  // Language is locked to Uzbek Cyrillic — no other languages supported
  const setLanguage = (_lang: AppLanguage) => setLanguageState(AppLanguage.UZ_CYRL);

  const t = (key: string): string => {
    const dict = translations[AppLanguage.UZ_CYRL];
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
