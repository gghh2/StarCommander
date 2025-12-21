/**
 * Star Commander - i18n (Internationalization)
 * Manages multi-language support
 */

let currentLang = 'en';
let translations = {};

// Available languages
const availableLanguages = {
    'en': 'English',
    'fr': 'Français',
    'es': 'Español',
    'pt': 'Português',
    'ru': 'Русский',
    'zh': '中文',
    'ja': '日本語',
    'ar': 'العربية'
};

// Load translation file
async function loadLanguage(lang) {
    try {
        const response = await fetch(`./locales/${lang}.json`);
        translations = await response.json();
        currentLang = lang;
        return true;
    } catch (error) {
        console.error(`Failed to load language ${lang}:`, error);
        // Fallback to English
        if (lang !== 'en') {
            return loadLanguage('en');
        }
        return false;
    }
}

// Get translation by key (supports nested keys with dot notation)
function t(key, params = {}) {
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
        if (value && typeof value === 'object') {
            value = value[k];
        } else {
            // Key not found - return the key itself as fallback
            console.warn(`Translation key not found: ${key}`);
            return key;
        }
    }
    
    // Replace parameters
    if (typeof value === 'string' && Object.keys(params).length > 0) {
        return value.replace(/\{(\w+)\}/g, (match, param) => {
            return params[param] !== undefined ? params[param] : match;
        });
    }
    
    return value || key;
}

// Apply translations to the DOM
function applyTranslations() {
    // Translate elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = t(key);
        
        // Check if we should translate innerHTML or textContent
        if (element.getAttribute('data-i18n-html') !== null) {
            element.innerHTML = translation;
        } else {
            element.textContent = translation;
        }
    });
    
    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = t(key);
    });
    
    // Translate titles/tooltips
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
        const key = element.getAttribute('data-i18n-title');
        element.title = t(key);
    });
}

// Change language
async function changeLanguage(lang) {
    if (!availableLanguages[lang]) {
        console.error(`Language ${lang} not available`);
        return false;
    }
    
    const success = await loadLanguage(lang);
    if (success) {
        applyTranslations();
        
        // Update language selector if exists
        const langSelect = document.getElementById('language-select');
        if (langSelect) {
            langSelect.value = lang;
        }
        
        // Trigger custom event for app to save preference
        window.dispatchEvent(new CustomEvent('language-changed', { detail: { lang } }));
    }
    return success;
}

// Initialize i18n
async function initI18n(defaultLang = 'en') {
    // Load saved language from config or use default
    const savedLang = await window.api?.config.get('language') || defaultLang;
    await loadLanguage(savedLang);
    
    // Apply RTL for Arabic
    if (currentLang === 'ar') {
        document.documentElement.setAttribute('dir', 'rtl');
    } else {
        document.documentElement.setAttribute('dir', 'ltr');
    }
    
    applyTranslations();
}

// Expose to global scope
window.i18n = {
    t,
    changeLanguage,
    getCurrentLanguage: () => currentLang,
    getAvailableLanguages: () => availableLanguages,
    applyTranslations
};
