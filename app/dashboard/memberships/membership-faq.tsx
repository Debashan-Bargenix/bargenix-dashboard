"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const faqs = [
  {
    question: "How do I upgrade my plan?",
    answer:
      "You can upgrade your plan by visiting the 'Available Plans' tab and selecting the plan that best fits your needs. After selecting a plan, you'll be redirected to Shopify to confirm the billing.",
  },
  {
    question: "When will I be billed for my subscription?",
    answer:
      "Your subscription is billed through Shopify's billing system. The first charge happens immediately upon subscription, and subsequent charges will occur on the same day each month.",
  },
  {
    question: "Can I downgrade my plan?",
    answer:
      "Yes, you can downgrade your plan at any time. Your current plan will remain active until the end of your billing cycle, after which you'll be moved to the new plan.",
  },
  {
    question: "What happens if I exceed my product limit?",
    answer:
      "If you exceed your product limit, you'll need to upgrade to a higher plan to add more products. Existing products will continue to work, but you won't be able to add new ones until you upgrade or remove some products.",
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "You can cancel your subscription by clicking the 'Cancel Plan' button on your current plan. Your subscription will be cancelled immediately, and you'll be downgraded to the free plan.",
  },
  {
    question: "Will I lose my data if I downgrade?",
    answer:
      "No, you won't lose your data when downgrading. However, if you have more products than allowed in your new plan, you won't be able to add new products until you're below the limit.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "Refunds are handled through Shopify's billing system. Please contact our support team if you need assistance with a refund request.",
  },
]

export default function MembershipFAQ() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Frequently Asked Questions</CardTitle>
        <CardDescription>Common questions about our membership plans and billing.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  )
}
