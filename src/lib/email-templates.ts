export interface EmailTemplate {
  name: string;
  subject: string;
  body: string;
  sequence_step: number;
  delay_days: number;
}

export const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    name: "Initial Outreach",
    subject: "Interested in your property at {address}",
    body: `Hi {owner_name},

I came across your property at {address} and I'm interested in purchasing it. Based on my analysis, this property could generate {monthly_rent}/month in Section 8 rental income with a DSCR of {dscr}.

Would you be open to discussing a potential sale? I can close quickly and handle all the paperwork.

Best regards,
{user_name}`,
    sequence_step: 1,
    delay_days: 0,
  },
  {
    name: "Follow-up (Day 3)",
    subject: "Following up — {address}",
    body: `Hi {owner_name},

I wanted to follow up on my previous email about your property at {address}. I'm a serious buyer and can move quickly if you're interested in selling.

Happy to jump on a quick call to discuss.

Best,
{user_name}`,
    sequence_step: 2,
    delay_days: 3,
  },
  {
    name: "Final Follow-up (Day 7)",
    subject: "Last check-in — {address}",
    body: `Hi {owner_name},

Just a final check-in regarding {address}. If now isn't the right time, no worries at all. I'll keep an eye on the market.

If anything changes, feel free to reach out anytime.

Best,
{user_name}`,
    sequence_step: 3,
    delay_days: 7,
  },
];

export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}
