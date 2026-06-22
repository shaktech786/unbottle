import type { Metadata } from "next";
import { LegalPage, Section, P, List, Mail, Internal } from "@/components/legal/legal-prose";

export const metadata: Metadata = {
  title: "Cookie Policy · Unbottle",
  description: "How Unbottle uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy" effectiveDate="June 22, 2026">
      <P>
        This Cookie Policy explains how Unbottle, operated by ShakTech Labs LLC, uses
        cookies and similar technologies. It supplements our{" "}
        <Internal href="/privacy">Privacy Policy</Internal>.
      </P>

      <Section title="What cookies are">
        <P>
          Cookies are small text files stored on your device. We also use related
          browser storage such as <code>localStorage</code>. Together these let the
          Service recognize you, keep you signed in, and remember your preferences.
        </P>
      </Section>

      <Section title="How we use them">
        <List>
          <li>
            <strong>Essential.</strong> Required for the Service to work &mdash; primarily
            authentication and session cookies set by Supabase to keep you securely
            logged in. These cannot be turned off without breaking core functionality.
          </li>
          <li>
            <strong>Preferences.</strong> Remember settings such as your workspace and UI
            choices.
          </li>
          <li>
            <strong>Analytics.</strong> Vercel Analytics helps us understand aggregate,
            privacy-friendly usage and performance. It does not use cross-site tracking
            cookies for advertising.
          </li>
        </List>
        <P>We do not use advertising or cross-site tracking cookies.</P>
      </Section>

      <Section title="Managing cookies">
        <P>
          You can control or delete cookies through your browser settings. Blocking
          essential cookies will prevent you from signing in and using the Service.
        </P>
      </Section>

      <Section title="Contact">
        <P>
          Questions about cookies? Email <Mail address="hi@shak-tech.com" />.
        </P>
      </Section>
    </LegalPage>
  );
}
