# Translation Contribution Guide

Thank you for your interest in helping translate Lume! This guide will help you contribute translations to make Lume accessible to users worldwide.

## 📋 Table of Contents

- [Current Languages](#current-languages)
- [Translation Files Structure](#translation-files-structure)
- [How to Add a New Language](#how-to-add-a-new-language)
- [Translation Guidelines](#translation-guidelines)
- [RTL (Right-to-Left) Languages](#rtl-right-to-left-languages)
- [Testing Your Translation](#testing-your-translation)
- [Submission Process](#submission-process)

## 🌍 Current Languages

- **English (en)** - Default language
- **Arabic (ar)** - العربية (RTL)

## 📁 Translation Files Structure

Translation files are located in `src/i18n/locales/` directory:

```
src/i18n/
├── config.ts           # i18n configuration
├── locales/
│   ├── en.json        # English translations
│   ├── ar.json        # Arabic translations
│   └── [lang].json    # Your language file
└── ...
```

Each translation file is a JSON object with nested keys:

```json
{
  "app": {
    "name": "Lume",
    "tagline": "Track your time, boost your productivity"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "tracker": "Time Tracker"
  }
}
```

## 🆕 How to Add a New Language

### Step 1: Create Translation File

1. Copy `src/i18n/locales/en.json` as a template
2. Name it with your language code (e.g., `fr.json` for French, `es.json` for Spanish)
3. Translate all values while keeping the keys unchanged

```bash
# Example: Adding French translation
cp src/i18n/locales/en.json src/i18n/locales/fr.json
```

### Step 2: Update i18n Configuration

Add your language to `src/i18n/config.ts`:

```typescript
import fr from './locales/fr.json';  // Import your translation

export const resources = {
  en: { translation: en },
  ar: { translation: ar },
  fr: { translation: fr },  // Add your language here
} as const;
```

### Step 3: Add to Language Selector

Update the language selector in `src/components/Settings.tsx`:

```tsx
<select value={language} onChange={(e) => changeLanguage(e.target.value)}>
  <option value="en">{t('settings.english')}</option>
  <option value="ar">{t('settings.arabic')}</option>
  <option value="fr">{t('settings.french')}</option>  {/* Add your language */}
</select>
```

### Step 4: Add Translation Keys

Add the language name translations in all language files:

```json
// In en.json
{
  "settings": {
    "french": "French (Français)"
  }
}

// In fr.json
{
  "settings": {
    "french": "Français"
  }
}

// In ar.json
{
  "settings": {
    "french": "الفرنسية (Français)"
  }
}
```

## 📝 Translation Guidelines

### DO:
- ✅ Keep translation keys unchanged (only translate values)
- ✅ Maintain consistent terminology throughout
- ✅ Consider context when translating
- ✅ Use native punctuation rules
- ✅ Test your translations in the app
- ✅ Keep formatting placeholders intact (e.g., `{{variable}}`)
- ✅ Match the tone and style of the original

### DON'T:
- ❌ Translate technical terms unless commonly translated
- ❌ Change JSON structure or keys
- ❌ Remove or add translation keys
- ❌ Use machine translation without review
- ❌ Include HTML or special characters unless in original

### Example:

```json
// ✅ GOOD
{
  "settings": {
    "trackingInterval": "Intervalle de suivi (secondes)"
  }
}

// ❌ BAD - Key changed
{
  "settings": {
    "intervalleDesuivi": "Intervalle de suivi (secondes)"
  }
}
```

## 🔄 RTL (Right-to-Left) Languages

If you're adding a RTL language (like Arabic, Hebrew, Persian, Urdu):

### Step 1: Register as RTL

Update `src/i18n/config.ts` to include your language:

```typescript
export const getDirection = (language: string): 'ltr' | 'rtl' => {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'your_lang'];  // Add here
  return rtlLanguages.includes(language) ? 'rtl' : 'ltr';
};
```

### Step 2: Test RTL Layout

The app automatically:
- Sets `dir="rtl"` on the document
- Mirrors the layout
- Adjusts text alignment

Test thoroughly to ensure UI elements display correctly.

## 🧪 Testing Your Translation

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

### 3. Test in App

1. Open the app
2. Go to Settings
3. Select your language from the dropdown
4. Navigate through all pages:
   - Dashboard
   - Time Tracker
   - Reports
   - Settings

### 4. Check for Issues

- Missing translations (English fallback appears)
- Text overflow or truncation
- Layout issues
- RTL alignment (if applicable)
- Context appropriateness

## 📤 Submission Process

### 1. Fork the Repository

```bash
git clone https://github.com/yourusername/lume.git
cd lume
```

### 2. Create a Branch

```bash
git checkout -b translation/your-language
# Example: git checkout -b translation/french
```

### 3. Make Changes

- Add your translation file
- Update configuration
- Update language selector
- Test thoroughly

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add [Language] translation

- Add [language] translation file
- Update i18n configuration
- Add language to settings selector
- [RTL support if applicable]
"
```

### 5. Push and Create PR

```bash
git push origin translation/your-language
```

Then create a Pull Request with:
- **Title**: `feat: Add [Language] translation`
- **Description**:
  - Language added
  - Language code
  - RTL support (yes/no)
  - Translation completeness (%)
  - Any special considerations

## 📋 Translation Checklist

Before submitting, ensure:

- [ ] All keys from `en.json` are translated
- [ ] No English text remains in translated file
- [ ] Language added to `config.ts`
- [ ] Language added to Settings dropdown
- [ ] Language name added to all translation files
- [ ] RTL configured (if applicable)
- [ ] Tested in development environment
- [ ] No layout breaking issues
- [ ] Text displays correctly on all screens
- [ ] PR created with proper description

## 🆘 Need Help?

- **Questions**: Open an issue with `translation` label
- **Discussion**: Join our community chat
- **Reference**: Check existing translations (`en.json`, `ar.json`)

## 🎉 Contributors

Thank you to all translation contributors:

- **English** - Lume Team
- **Arabic (العربية)** - Lume Team
<!-- Add your name here after contributing! -->

## 📜 License

All translations are licensed under the same MIT License as the project.

---

**Thank you for helping make Lume accessible to everyone! 🌍**
