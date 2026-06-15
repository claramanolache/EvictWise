import React from 'react';
import { useTranslation } from 'react-i18next';

const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'ro', label: 'Română' },
    {value: 'zh', label: '中文'},
    {value: 'hi', label: 'हिंदी'}
];

const LangSelection = () => {
    const { i18n } = useTranslation();

    const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newLang = event.target.value;
        i18n.changeLanguage(newLang);
    };

    return (
        <div>
            <label htmlFor="language-select">Choose a language:</label>
            <select id="language-select" onChange={handleLanguageChange} value={i18n.language}>
                {languageOptions.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default LangSelection;
