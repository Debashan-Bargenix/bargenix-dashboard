import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, Globe, Mail, MapPin, Phone } from "lucide-react"

export function ContactDetails() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Contact Information
        </CardTitle>
        <CardDescription>Get in touch with our team</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Email Support</p>
              <p className="text-sm text-muted-foreground">support@bargenix.com</p>
              <p className="text-xs text-muted-foreground">Response within 24-48 hours</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Help Center</p>
              <p className="text-sm text-muted-foreground">Access our knowledge base and tutorials</p>
              <Button variant="link" className="h-auto p-0 text-xs" asChild>
                <a href="https://bargenix.freshdesk.com/support/home" target="_blank" rel="noopener noreferrer">
                  Visit Help Center <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Business Address</p>
              <p className="text-sm text-muted-foreground">
                Bargenix Technologies
                <br />
                123 Innovation Drive
                <br />
                Tech City, TC 12345
                <br />
                United States
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button asChild className="w-full">
            <a
              href="https://bargenix.freshdesk.com/support/home"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              Submit a Support Request
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">Opens in a new tab</p>
        </div>
      </CardContent>
    </Card>
  )
}
