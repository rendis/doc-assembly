import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="relative flex items-center">
      <Globe className="absolute left-2 h-4 w-4 text-slate-500 pointer-events-none" />
      <select
        onChange={changeLanguage}
        value={i18n.resolvedLanguage}
        className="h-9 appearance-none rounded-md border border-slate-200 bg-transparent pl-8 pr-8 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
      {/* Flecha personalizada CSS puro para reemplazar la nativa si se desea, o dejar la nativa */}
    </div>
  );
};
