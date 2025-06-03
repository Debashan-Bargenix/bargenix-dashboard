"use client"

import { useState, useEffect } from "react"

interface FeatureAccessProps {
  currentPlanSlug: string | null
  featureMap: Record<string, string[]>
}

export function useFeatureAccess({ currentPlanSlug, featureMap }: FeatureAccessProps) {
  const [loading, setLoading] = useState(true)
  const [features, setFeatures] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!currentPlanSlug) {
      setFeatures({})
      setLoading(false)
      return
    }

    // Build feature access map
    const accessMap: Record<string, boolean> = {}

    // Get all feature keys
    const allFeatures = Object.keys(featureMap)

    // For each feature, check if the current plan has access
    allFeatures.forEach((feature) => {
      const plansWithAccess = featureMap[feature] || []
      accessMap[feature] = plansWithAccess.includes(currentPlanSlug)
    })

    setFeatures(accessMap)
    setLoading(false)
  }, [currentPlanSlug, featureMap])

  const hasAccess = (feature: string): boolean => {
    return features[feature] || false
  }

  return {
    loading,
    hasAccess,
    features,
  }
}

// Example feature map
export const defaultFeatureMap: Record<string, string[]> = {
  add_products_unlimited: ["business", "enterprise"],
  custom_chatbot_theme: ["enterprise"],
  bargaining_level_control: ["business", "enterprise"],
  inventory_sync: ["free", "startup", "business", "enterprise"],
  coupon_customization: ["enterprise"],
  branding_removal: ["startup", "business", "enterprise"],
  api_access: ["business", "enterprise"],
  priority_support: ["startup", "business", "enterprise"],
  analytics_dashboard: ["startup", "business", "enterprise"],
  advanced_analytics: ["business", "enterprise"],
}
