"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SimpleProfileForm } from "./simple-profile-form"
import { SimplePasswordForm } from "./simple-password-form"
import { SimpleNotificationsForm } from "./simple-notifications-form"
import { SimplePreferencesForm } from "./simple-preferences-form"

interface SimpleAccountTabsProps {
  user: any
}

export function SimpleAccountTabs({ user }: SimpleAccountTabsProps) {
  const [activeTab, setActiveTab] = useState("profile")

  return (
    <Tabs defaultValue="profile" className="w-full" onValueChange={setActiveTab}>
      <TabsList className="grid grid-cols-4 mb-6">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="preferences">Preferences</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information and contact details.</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleProfileForm user={user} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="password" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your password to keep your account secure.</CardDescription>
          </CardHeader>
          <CardContent>
            <SimplePasswordForm userId={user.id} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="notifications" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Manage how you receive notifications and updates.</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleNotificationsForm userId={user.id} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="preferences" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Account Preferences</CardTitle>
            <CardDescription>Customize your dashboard experience.</CardDescription>
          </CardHeader>
          <CardContent>
            <SimplePreferencesForm userId={user.id} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
