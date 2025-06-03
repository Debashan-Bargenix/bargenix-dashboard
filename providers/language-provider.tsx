"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

export type Language = "en" | "es" | "fr" | "de" | "zh" | "ja" | "pt" | "ru" | "ar" | "hi"

type LanguageContextType = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Simple translations for demonstration
const translations: Record<Language, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    inventory: "Inventory",
    analytics: "Analytics",
    shopify: "Shopify",
    chatbot: "Chatbot",
    requestBargain: "Request Bargain",
    memberships: "Memberships",
    myAccount: "My Account",
    logout: "Logout",
    // Add more translations as needed
  },
  es: {
    dashboard: "Panel",
    inventory: "Inventario",
    analytics: "Analítica",
    shopify: "Shopify",
    chatbot: "Chatbot",
    requestBargain: "Solicitar Regateo",
    memberships: "Membresías",
    myAccount: "Mi Cuenta",
    logout: "Cerrar Sesión",
  },
  fr: {
    dashboard: "Tableau de bord",
    inventory: "Inventaire",
    analytics: "Analytique",
    shopify: "Shopify",
    chatbot: "Chatbot",
    requestBargain: "Demande de Négociation",
    memberships: "Adhésions",
    myAccount: "Mon Compte",
    logout: "Déconnexion",
  },
  de: {
    dashboard: "Dashboard",
    inventory: "Inventar",
    analytics: "Analytik",
    shopify: "Shopify",
    chatbot: "Chatbot",
    requestBargain: "Verhandlung Anfragen",
    memberships: "Mitgliedschaften",
    myAccount: "Mein Konto",
    logout: "Abmelden",
  },
  zh: {
    dashboard: "仪表板",
    inventory: "库存",
    analytics: "分析",
    shopify: "Shopify",
    chatbot: "聊天机器人",
    requestBargain: "请求议价",
    memberships: "会员资格",
    myAccount: "我的账户",
    logout: "登出",
  },
  ja: {
    dashboard: "ダッシュボード",
    inventory: "在庫",
    analytics: "分析",
    shopify: "Shopify",
    chatbot: "チャットボット",
    requestBargain: "値引き交渉",
    memberships: "メンバーシップ",
    myAccount: "マイアカウント",
    logout: "ログアウト",
  },
  pt: {
    dashboard: "Painel",
    inventory: "Inventário",
    analytics: "Análises",
    shopify: "Shopify",
    chatbot: "Chatbot",
    requestBargain: "Solicitar Barganha",
    memberships: "Associações",
    myAccount: "Minha Conta",
    logout: "Sair",
  },
  ru: {
    dashboard: "Панель управления",
    inventory: "Инвентарь",
    analytics: "Аналитика",
    shopify: "Shopify",
    chatbot: "Чатбот",
    requestBargain: "Запрос на торг",
    memberships: "Членство",
    myAccount: "Мой аккаунт",
    logout: "Выйти",
  },
  ar: {
    dashboard: "لوحة القيادة",
    inventory: "المخزون",
    analytics: "التحليلات",
    shopify: "Shopify",
    chatbot: "روبوت الدردشة",
    requestBargain: "طلب المساومة",
    memberships: "العضويات",
    myAccount: "حسابي",
    logout: "تسجيل الخروج",
  },
  hi: {
    dashboard: "डैशबोर्ड",
    inventory: "इन्वेंटरी",
    analytics: "एनालिटिक्स",
    shopify: "Shopify",
    chatbot: "चैटबॉट",
    requestBargain: "मोल-भाव अनुरोध",
    memberships: "सदस्यता",
    myAccount: "मेरा खाता",
    logout: "लॉग आउट",
  },
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en")

  // Function to get translation
  const t = (key: string): string => {
    return translations[language]?.[key] || key
  }

  // Save language preference to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("language", language)

      // Also update the html lang attribute
      document.documentElement.lang = language
    }
  }, [language])

  // Load language preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLanguage = localStorage.getItem("language") as Language
      if (savedLanguage && Object.keys(translations).includes(savedLanguage)) {
        setLanguage(savedLanguage)
      }
    }
  }, [])

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
