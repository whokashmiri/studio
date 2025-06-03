
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
    saving: "Saving...",
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
    folderCreated: "Folder Created",
    allProjects: "All Projects",
    assetsIn: "Assets in",
    manageAssetsPrompt: "Manage assets within the selected folder or project root.",
    noAssetsInLocation: "No assets found in this location.",
    inside: "inside",
    to: "to",
    folderNamePlaceholder: "e.g., Inspection Area 1",
    assetNameRequiredTitle: "Asset Name Required",
    assetNameRequiredDesc: "Please enter a name for the asset.",
    assetSavedTitle: "Asset Saved",
    assetSavedDesc: "Asset \"{assetName}\" has been saved.",
    nextAddPhotos: "Next: Add Photos",
    addDescriptionFor: "Add Description for:",
    provideDetailsPrompt: "Provide detailed information about the asset.",
    photosAdded: "Photos Added",
    editPhotos: "Add/Edit Photos",
    removePhotoTitle: "Remove photo",
    addPhotosFor: "Add Photos for",
    takeOrUploadPhotosPrompt: "You can take new photos or upload from your gallery. Max {MAX_PHOTOS} photos.",
    noPhotosAddedYet: "No photos added yet.",
    nextStepDescription: "Next: Description",
    skipPhotosAndNext: "Skip Photos & Next",
    savePhotosAndContinue: "Save Photos & Continue",
    backTo: "Back to",
    enterAssetNamePrompt: "Enter the asset name.",
    assetNamePlaceholder: "e.g., Main Entrance Column",
    inFolder: "In folder:",
    maxPhotosTitle: "Maximum {MAX_PHOTOS} Photos",
    maxPhotosDesc: "You can upload a maximum of {MAX_PHOTOS} photos.",
    maxPhotosReached: "You have reached the maximum of {MAX_PHOTOS} photos.",
    noCompaniesAvailable: "No companies available. Please check the data source.",
    useSpeech: "Use Speech",
    listening: "Listening...",
    aiSummary: "AI Summary",
    summarizing: "Summarizing...",
    aiGeneratedSummary: "AI Generated Summary:",
    saveDescription: "Save Description & Asset",
    typeOrUseSpeech: "Type or use voice to enter description...",
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
    saving: "جاري الحفظ...",
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
    folderCreated: "تم إنشاء المجلد",
    allProjects: "كل المشاريع",
    assetsIn: "الأصول في",
    manageAssetsPrompt: "إدارة الأصول داخل المجلد المحدد أو جذر المشروع.",
    noAssetsInLocation: "لا توجد أصول في هذا الموقع.",
    inside: "داخل",
    to: "إلى",
    folderNamePlaceholder: "مثال: منطقة الفحص 1",
    assetNameRequiredTitle: "اسم الأصل مطلوب",
    assetNameRequiredDesc: "الرجاء إدخال اسم للأصل.",
    assetSavedTitle: "تم حفظ الأصل",
    assetSavedDesc: "تم حفظ الأصل \"{assetName}\".",
    nextAddPhotos: "التالي: إضافة صور",
    addDescriptionFor: "إضافة وصف لـ:",
    provideDetailsPrompt: "قدم معلومات مفصلة عن الأصل.",
    photosAdded: "الصور المضافة",
    editPhotos: "إضافة/تعديل الصور",
    removePhotoTitle: "إزالة الصورة",
    addPhotosFor: "إضافة صور لـ",
    takeOrUploadPhotosPrompt: "يمكنك التقاط صور جديدة أو التحميل من معرض الصور الخاص بك. الحد الأقصى {MAX_PHOTOS} صور.",
    noPhotosAddedYet: "لم تتم إضافة أي صور بعد.",
    nextStepDescription: "التالي: الوصف",
    skipPhotosAndNext: "تخطي الصور والتالي",
    savePhotosAndContinue: "حفظ الصور والمتابعة",
    backTo: "العودة إلى",
    enterAssetNamePrompt: "أدخل اسم الأصل.",
    assetNamePlaceholder: "مثال: عمود المدخل الرئيسي",
    inFolder: "في المجلد:",
    maxPhotosTitle: "الحد الأقصى {MAX_PHOTOS} صور",
    maxPhotosDesc: "يمكنك تحميل {MAX_PHOTOS} صور كحد أقصى.",
    maxPhotosReached: "لقد وصلت إلى الحد الأقصى لعدد الصور وهو {MAX_PHOTOS} صور.",
    noCompaniesAvailable: "لا توجد شركات متاحة. يرجى التحقق من مصدر البيانات.",
    useSpeech: "استخدام الصوت",
    listening: "يستمع...",
    aiSummary: "ملخص الذكاء الاصطناعي",
    summarizing: "يلخص...",
    aiGeneratedSummary: "الملخص الذي تم إنشاؤه بواسطة الذكاء الاصطناعي:",
    saveDescription: "حفظ الوصف والأصل",
    typeOrUseSpeech: "اكتب أو استخدم الصوت لإدخال الوصف...",
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

  const t = (key: string, defaultText: string, params?: Record<string, string | number>): string => {
    let text = translations[language]?.[key] || defaultText || key;
    if (params) {
      Object.keys(params).forEach(paramKey => {
        text = text.replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }
    return text;
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
