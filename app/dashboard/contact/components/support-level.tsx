import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Mail, MessageCircle, Phone, Shield, Zap } from "lucide-react"

interface SupportLevelProps {
  planName: string
  planSlug: string
}

export function SupportLevel({ planName, planSlug }: SupportLevelProps) {
  const getSupportDetails = (slug: string) => {
    switch (slug) {
      case "free":
        return {
          level: "Community Support",
          responseTime: "48-72 hours",
          channels: ["Email", "Help Center"],
          features: ["Access to help documentation", "Community forum access", "Email support (business hours)"],
          badge: "Basic",
          badgeColor: "secondary" as const,
          icon: Mail,
        }
      case "startup":
        return {
          level: "Priority Support",
          responseTime: "24-48 hours",
          channels: ["Email", "Help Center", "Live Chat"],
          features: [
            "Priority email support",
            "Live chat support (business hours)",
            "Access to video tutorials",
            "Feature request submissions",
          ],
          badge: "Priority",
          badgeColor: "default" as const,
          icon: MessageCircle,
        }
      case "business":
        return {
          level: "Premium Support",
          responseTime: "12-24 hours",
          channels: ["Email", "Help Center", "Live Chat", "Phone"],
          features: [
            "Premium support with faster response",
            "Phone support (business hours)",
            "Dedicated account manager",
            "Custom integration assistance",
            "Priority feature requests",
          ],
          badge: "Premium",
          badgeColor: "default" as const,
          icon: Phone,
        }
      case "enterprise":
        return {
          level: "Enterprise Support",
          responseTime: "2-4 hours",
          channels: ["Email", "Help Center", "Live Chat", "Phone", "Dedicated Slack"],
          features: [
            "24/7 priority support",
            "Dedicated support team",
            "Custom onboarding",
            "SLA guarantees",
            "Direct access to engineering team",
            "Custom feature development",
          ],
          badge: "Enterprise",
          badgeColor: "default" as const,
          icon: Shield,
        }
      default:
        return {
          level: "Community Support",
          responseTime: "48-72 hours",
          channels: ["Email"],
          features: ["Basic email support"],
          badge: "Basic",
          badgeColor: "secondary" as const,
          icon: Mail,
        }
    }
  }

  const support = getSupportDetails(planSlug)
  const IconComponent = support.icon

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className="h-5 w-5" />
            Your Support Level
          </div>
          <Badge variant={support.badgeColor}>{support.badge}</Badge>
        </CardTitle>
        <CardDescription>Current plan: {planName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Response Time
            </div>
            <p className="text-sm text-muted-foreground">{support.responseTime}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4" />
              Support Channels
            </div>
            <p className="text-sm text-muted-foreground">{support.channels.join(", ")}</p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">What's Included:</h4>
          <ul className="space-y-1">
            {support.features.map((feature, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {planSlug === "free" && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>Want faster support?</strong> Upgrade to a paid plan for priority support and additional features.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
