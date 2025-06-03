"use client";
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: Dispatch<SetStateAction<Language>>;
  direction: 'ltr' | 'rtl';
  t: (key: string, defaultText: string) => string; // Simple translation function
}

// Basic translations - extend as needed
const translations: Record<Language, Record<string, string>> = {
  en: {
    appName: "Asset Inspector Pro",
    selectCompany: "Select a Company",
    selectedCompany: "Selected Company",
    done: "Done",
    favorite: "Favorite",
    recent: "Recent",
    new: "New",
    createNewProject: "Create New Project",
    projectName: "Project Name",
    cancel: "Cancel",
    save: "Save",
    newAsset: "New Asset",
    takePhotos: "Take Photos",
    uploadFromGallery: "Upload from Gallery",
    assetName: "Asset Name",
    description: "Description",
    speechToText: "Speech to Text",
    skip: "Skip",
    noProjectsFound: "No projects found in this category.",
    folders: "Folders",
    assets: "Assets",
    addNewFolder: "Add New Folder",
    folderName: "Folder Name",
    confirm: "Confirm",
  },
  ar: {
    appName: "مفتش الأصول برو",
    selectCompany: "اختر شركة",
    selectedCompany: "الشركة المختارة",
    done: "مكتمل",
    favorite: "مفضل",
    recent: "الأخيرة",
    new: "جديد",
    createNewProject: "إنشاء مشروع جديد",
    projectName: "اسم المشروع",
    cancel: "إلغاء",
    save: "حفظ",
    newAsset: "أصل جديد",
    takePhotos: "التقاط صور",
    uploadFromGallery: "تحميل من المعرض",
    assetName: "اسم الأصل",
    description: "الوصف",
    speechToText: "تحويل الكلام إلى نص",
    skip: "تخطي",
    noProjectsFound: "لا توجد مشاريع في هذه الفئة.",
    folders: "مجلدات",
    assets: "أصول",
    addNewFolder: "إضافة مجلد جديد",
    folderName: "اسم المجلد",
    confirm: "تأكيد",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [language, direction]);

  const t = (key: string, defaultText: string): string => {
    return translations[language]?.[key] || defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, direction, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
