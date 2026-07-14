import type { Metadata } from "next";
import { LegalPage, Section, P, List, Mail, Internal } from "@/components/legal/legal-prose";

export const metadata: Metadata = {
  title: "Terms of Service · Unbottle",
  description: "The terms that govern your use of Unbottle.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" effectiveDate="June 22, 2026">
      <P>
        These Terms of Service (&ldquo;Terms&rdquo;) are a binding agreement between you and
        ShakTech Labs LLC (&ldquo;ShakTech&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), the operator of
        Unbottle (the &ldquo;Service&rdquo;). By creating an account or using the Service, you
        agree to these Terms and to our <Internal href="/privacy">Privacy Policy</Internal>.
        If you do not agree, do not use the Service.
      </P>

      <Section title="1. Eligibility">
        <P>
          You must be at least 13 years old (or the minimum age of digital consent in
          your jurisdiction) to use the Service. If you are under 18, you may only use
          the Service with the consent of a parent or legal guardian. By using the
          Service you represent that you meet these requirements.
        </P>
      </Section>

      <Section title="2. Your account">
        <P>
          You are responsible for the activity that occurs under your account and for
          keeping your login credentials secure. Notify us promptly at{" "}
          <Mail address="hi@shak-tech.com" /> if you suspect unauthorized use. We are
          not liable for any loss arising from your failure to safeguard your account.
        </P>
      </Section>

      <Section title="3. Subscriptions, billing, and refunds">
        <List>
          <li>
            Paid plans are billed through our payment processor, Stripe, on a recurring
            basis until cancelled. By subscribing you authorize us to charge the
            applicable fees to your payment method.
          </li>
          <li>
            Subscriptions renew automatically at the end of each billing period. You may
            cancel at any time from your billing settings; cancellation takes effect at
            the end of the current period.
          </li>
          <li>
            Except where required by law, fees are non-refundable and we do not provide
            refunds or credits for partial billing periods or unused features.
          </li>
          <li>
            We may change our prices or plan features on reasonable prior notice. Price
            changes apply from your next billing period.
          </li>
        </List>
      </Section>

      <Section title="4. Your content">
        <P>
          You retain all ownership rights in the audio recordings, MIDI, arrangements,
          session data, messages, and other material you create or upload
          (&ldquo;Your Content&rdquo;). You grant us a limited, non-exclusive, worldwide license to
          host, store, process, and transmit Your Content solely to operate, maintain,
          and improve the Service for you &mdash; for example, to generate suggestions,
          render playback, and export files.
        </P>
        <P>
          You are responsible for Your Content and represent that you have the rights
          necessary to upload it and that it does not infringe the rights of others.
        </P>
      </Section>

      <Section title="5. AI-generated output">
        <List>
          <li>
            The Service uses third-party AI models (including Anthropic&rsquo;s Claude and
            ElevenLabs) to generate chord progressions, melodies, arrangement
            suggestions, audio, and conversational responses (&ldquo;Output&rdquo;).
          </li>
          <li>
            As between you and us, you may use Output for your own musical projects,
            including commercially, subject to these Terms and the terms of the
            underlying model providers.
          </li>
          <li>
            Output is generated probabilistically and may be inaccurate, non-original,
            or similar to output provided to other users. You are responsible for
            reviewing Output before relying on or releasing it, and for ensuring it does
            not infringe third-party rights.
          </li>
          <li>
            Do not use the Service to generate content that is unlawful, infringing, or
            that violates the acceptable use policies of our model providers.
          </li>
        </List>
      </Section>

      <Section title="6. Acceptable use">
        <P>You agree not to:</P>
        <List>
          <li>break the law or infringe anyone&rsquo;s intellectual property or privacy rights;</li>
          <li>upload malware, attempt to gain unauthorized access, or disrupt the Service;</li>
          <li>
            circumvent usage limits or rate limits, scrape the Service, or use it to
            build a competing product;
          </li>
          <li>
            reverse engineer the Service except to the extent that restriction is
            prohibited by law;
          </li>
          <li>upload content that is harassing, hateful, abusive, or sexually exploitative.</li>
        </List>
      </Section>

      <Section title="7. Third-party services">
        <P>
          The Service relies on third parties including Supabase (database and
          authentication), Anthropic, ElevenLabs, Stripe, Resend, Vercel, and Upstash.
          Your use of the Service is also subject to those providers&rsquo; terms, and we are
          not responsible for their acts or omissions.
        </P>
      </Section>

      <Section title="8. Disclaimers">
        <P>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any
          kind, whether express or implied, including warranties of merchantability,
          fitness for a particular purpose, and non-infringement. We do not warrant that
          the Service will be uninterrupted, secure, or error-free, or that Output will
          meet your requirements.
        </P>
      </Section>

      <Section title="9. Limitation of liability">
        <P>
          To the maximum extent permitted by law, ShakTech and its officers, employees,
          and suppliers will not be liable for any indirect, incidental, special,
          consequential, or punitive damages, or for any loss of data, revenue, profits,
          or creative work. Our total liability for any claim relating to the Service
          will not exceed the greater of the amounts you paid us in the twelve months
          before the claim or USD $50.
        </P>
      </Section>

      <Section title="10. Indemnification">
        <P>
          You agree to indemnify and hold ShakTech harmless from any claims, damages,
          and expenses (including reasonable legal fees) arising out of Your Content,
          your use of the Service, or your violation of these Terms.
        </P>
      </Section>

      <Section title="11. Termination">
        <P>
          You may stop using the Service and delete your account at any time. We may
          suspend or terminate your access if you breach these Terms or if we are
          required to do so by law. Sections that by their nature should survive
          termination (including ownership, disclaimers, limitation of liability, and
          indemnification) will survive.
        </P>
      </Section>

      <Section title="12. Changes to these Terms">
        <P>
          We may update these Terms from time to time. If we make material changes, we
          will provide reasonable notice (for example, by email or in-app notice).
          Continued use of the Service after changes take effect constitutes acceptance.
        </P>
      </Section>

      <Section title="13. Governing law">
        <P>
          These Terms are governed by the laws of the State of Georgia, United States,
          without regard to its conflict-of-laws rules. You agree to the exclusive
          jurisdiction of the state and federal courts located in Georgia for any
          dispute that is not subject to arbitration or small-claims resolution.
        </P>
      </Section>

      <Section title="14. Contact">
        <P>
          Questions about these Terms? Email us at <Mail address="hi@shak-tech.com" />.
        </P>
      </Section>
    </LegalPage>
  );
}
