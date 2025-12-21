# Star Commander - Internationalization (i18n)

## Available Languages

- **English** (en) - Default
- **Français** (fr)
- **Español** (es)
- **Português** (pt)
- **Русский** (ru)
- **中文** (zh)
- **日本語** (ja)
- **العربية** (ar)

## File Structure

All translation files are located in:
```
src/renderer/locales/
├── en.json (English - reference file)
├── fr.json (French)
├── es.json (Spanish)
├── pt.json (Portuguese)
├── ru.json (Russian)
├── zh.json (Chinese)
├── ja.json (Japanese)
└── ar.json (Arabic)
```

## Translation File Format

Each translation file is a JSON file with nested keys:

```json
{
  "app": {
    "title": "Star Commander",
    "version": "V4.0"
  },
  "buttons": {
    "start": "Start",
    "stop": "Stop",
    "save": "Save"
  }
}
```

## How to Use Translations in HTML

Add `data-i18n` attribute to any element:

```html
<!-- For text content -->
<button data-i18n="buttons.start">Start</button>

<!-- For HTML content (use data-i18n-html) -->
<p data-i18n="wizard.step1" data-i18n-html></p>

<!-- For placeholders -->
<input data-i18n-placeholder="bots.token" placeholder="Bot Token">

<!-- For titles/tooltips -->
<button data-i18n-title="buttons.save" title="Save">💾</button>
```

## How to Add a New Language

1. Create a new file in `src/renderer/locales/` (e.g., `de.json` for German)
2. Copy the structure from `en.json`
3. Translate all values
4. Add the language to `i18n.js`:
   ```javascript
   const availableLanguages = {
       // ...
       'de': 'Deutsch'  // Add this line
   };
   ```
5. Add the option to language selectors in `index.html`:
   ```html
   <option value="de">Deutsch</option>
   ```

## How to Add New Translation Keys

1. Add the key to `en.json` first (reference file)
2. Add the same key to all other language files
3. Use the key in HTML with `data-i18n` or in JS with `t('key.name')`

## Using Translations in JavaScript

```javascript
// Simple translation
const text = window.i18n.t('buttons.start');

// With parameters
const text = window.i18n.t('logs.configExported', { path: '/path/to/file' });
// Translation: "Config exported: {path}"
// Result: "Config exported: /path/to/file"

// Change language
await window.i18n.changeLanguage('fr');

// Get current language
const currentLang = window.i18n.getCurrentLanguage();
```

## Special Cases

### Right-to-Left (RTL) Languages

Arabic is automatically detected and applies RTL layout:
```javascript
if (currentLang === 'ar') {
    document.documentElement.setAttribute('dir', 'rtl');
}
```

### Dynamic Content

After adding dynamic content to the page, apply translations:
```javascript
window.i18n.applyTranslations();
```

## Testing Translations

1. Launch the application
2. Go to **Options** tab
3. Select a language from the dropdown
4. The interface updates immediately
5. The language preference is saved automatically

## Contributing Translations

To improve existing translations or add new languages:

1. Edit the appropriate `.json` file in `src/renderer/locales/`
2. Keep the same JSON structure as `en.json`
3. Test your changes in the application
4. Ensure special characters are properly escaped

## Translation Priorities

**High Priority** (commonly used):
- Tabs, buttons, status messages
- Options, keybinds
- Error messages

**Medium Priority**:
- Wizard steps
- Help texts

**Low Priority**:
- Developer-facing content
- Debug messages
