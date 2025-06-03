"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileTab } from "./profile-tab"
import { PasswordTab } from "./password-tab"
import { NotificationsTab } from "./notifications-tab"
import { PreferencesTab } from "./preferences-tab"
import { DangerZoneTab } from "./danger-zone-tab"
import { ErrorBoundary } from "@/components/error-boundary"

interface AccountTabsProps {
  userId: number
}

export function AccountTabs({ userId }: AccountTabsProps) {
  const [activeTab, setActiveTab] = useState("profile")

  if (!userId) {
    return <div className="text-red-500">Error: User ID is required</div>
  }

  return (
    <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-5 mb-8">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="preferences">Preferences</TabsTrigger>
        <TabsTrigger value="danger">Danger Zone</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ErrorBoundary
          fallback={<div className="p-4 text-red-500 border border-red-200 rounded-md">Error loading profile tab</div>}
        >
          <ProfileTab userId={userId} />
        </ErrorBoundary>
      </TabsContent>

      <TabsContent value="password">
        <ErrorBoundary
          fallback={<div className="p-4 text-red-500 border border-red-200 rounded-md">Error loading password tab</div>}
        >
          <PasswordTab userId={userId} />
        </ErrorBoundary>
      </TabsContent>

      <TabsContent value="notifications">
        <ErrorBoundary
          fallback={
            <div className="p-4 text-red-500 border border-red-200 rounded-md">Error loading notifications tab</div>
          }
        >
          <NotificationsTab userId={userId} />
        </ErrorBoundary>
      </TabsContent>

      <TabsContent value="preferences">
        <ErrorBoundary
          fallback={
            <div className="p-4 text-red-500 border border-red-200 rounded-md">Error loading preferences tab</div>
          }
        >
          <PreferencesTab userId={userId} />
        </ErrorBoundary>
      </TabsContent>

      <TabsContent value="danger">
        <ErrorBoundary
          fallback={
            <div className="p-4 text-red-500 border border-red-200 rounded-md">Error loading danger zone tab</div>
          }
        >
          <DangerZoneTab userId={userId} />
        </ErrorBoundary>
      </TabsContent>
    </Tabs>
  )
}
