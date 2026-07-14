import type { Metadata } from "next";
import { LegalPage, Section, P, List, Mail, Internal } from "@/components/legal/legal-prose";

export const metadata: Metadata = {
  title: "Privacy Policy · Unbottle",
  description: "How Unbottle collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" effectiveDate="June 22, 2026">
      <P>
        This Privacy Policy explains how ShakTech Labs LLC (&ldquo;ShakTech&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
        collects, uses, and shares information when you use Unbottle (the &ldquo;Service&rdquo;).
        By using the Service you agree to this Policy. See also our{" "}
        <Internal href="/terms">Terms of Service</Internal> and{" "}
        <Internal href="/cookies">Cookie Policy</Internal>.
      </P>

      <Section title="1. Information we collect">
        <P>We collect the following categories of information:</P>
        <List>
          <li>
            <strong>Account information.</strong> Your email address and, optionally, a
            display name and avatar. Authentication is handled by Supabase; if you sign
            in with a third-party provider (OAuth), we receive the basic profile data
            that provider shares.
          </li>
          <li>
            <strong>Production content.</strong> The sessions, song sections, chord
            progressions, tracks, MIDI notes, bookmarks, branches, and preferences you
            create in the Service.
          </li>
          <li>
            <strong>Audio and captures.</strong> Audio recordings, rhythm taps, and text
            descriptions you upload, along with any transcriptions or analysis derived
            from them.
          </li>
          <li>
            <strong>AI conversations.</strong> The messages you exchange with the AI
            producer, including their content and related metadata.
          </li>
          <li>
            <strong>Billing information.</strong> If you subscribe, our payment
            processor Stripe collects your payment details. We receive a Stripe customer
            ID, subscription status, and billing period &mdash; we do not store full card
            numbers.
          </li>
          <li>
            <strong>Usage and technical data.</strong> Token-usage logs (model,
            endpoint, input/output token counts), rate-limit counters, log data, and
            aggregate analytics about how the Service is used.
          </li>
        </List>
      </Section>

      <Section title="2. How we use your information">
        <List>
          <li>to provide, operate, and maintain the Service and your account;</li>
          <li>
            to generate AI suggestions, arrangements, audio, and responses based on your
            sessions and prompts;
          </li>
          <li>to process subscriptions and payments;</li>
          <li>to send transactional emails such as password resets and account notices;</li>
          <li>to enforce usage limits, prevent abuse, and secure the Service;</li>
          <li>to understand usage and improve features, performance, and reliability;</li>
          <li>to comply with legal obligations.</li>
        </List>
        <P>
          We do not sell your personal information, and we do not use the content of
          your sessions or conversations to train our own models.
        </P>
      </Section>

      <Section title="3. Service providers we share data with">
        <P>
          We share data with the following processors only as needed to run the Service:
        </P>
        <List>
          <li><strong>Supabase</strong> &mdash; database, authentication, and file storage.</li>
          <li>
            <strong>Anthropic (Claude)</strong> &mdash; processes your prompts and session
            context to generate AI responses.
          </li>
          <li><strong>ElevenLabs</strong> &mdash; generates audio from your requests.</li>
          <li><strong>Stripe</strong> &mdash; payment processing and subscription management.</li>
          <li><strong>Resend</strong> &mdash; delivery of transactional email.</li>
          <li><strong>Vercel</strong> &mdash; hosting and product analytics.</li>
          <li><strong>Upstash</strong> &mdash; rate limiting.</li>
        </List>
        <P>
          Each provider processes data under its own terms and privacy policy. We may
          also disclose information if required by law or to protect our rights and the
          safety of our users.
        </P>
      </Section>

      <Section title="4. Data retention">
        <P>
          We keep your information for as long as your account is active or as needed to
          provide the Service. When you delete content or your account, we delete the
          associated data within a reasonable period, except where we must retain it to
          comply with legal, accounting, or security obligations. Backups are purged on a
          rolling schedule.
        </P>
      </Section>

      <Section title="5. Your rights and choices">
        <List>
          <li>
            <strong>Access and portability.</strong> You can view and export your
            sessions and content from within the Service.
          </li>
          <li>
            <strong>Correction and deletion.</strong> You can edit your profile and
            delete your content or account at any time.
          </li>
          <li>
            <strong>Privacy rights.</strong> Depending on where you live (for example
            under the GDPR or California&rsquo;s CCPA/CPRA), you may have rights to access,
            correct, delete, or restrict processing of your personal information, and to
            object to certain processing. To exercise these rights, email{" "}
            <Mail address="hi@shak-tech.com" />.
          </li>
        </List>
      </Section>

      <Section title="6. Security">
        <P>
          We use industry-standard measures to protect your data, including encryption
          in transit, scoped access controls, and private, user-scoped storage buckets
          for your audio and exports. No method of transmission or storage is completely
          secure, so we cannot guarantee absolute security.
        </P>
      </Section>

      <Section title="7. International transfers">
        <P>
          Our providers may process and store data in the United States and other
          countries. Where required, we rely on appropriate safeguards (such as Standard
          Contractual Clauses) for international transfers.
        </P>
      </Section>

      <Section title="8. Children">
        <P>
          The Service is not directed to children under 13, and we do not knowingly
          collect personal information from them. If you believe a child has provided us
          information, contact us and we will delete it.
        </P>
      </Section>

      <Section title="9. Changes to this Policy">
        <P>
          We may update this Policy from time to time. If we make material changes, we
          will provide reasonable notice and update the effective date above.
        </P>
      </Section>

      <Section title="10. Contact">
        <P>
          Questions or privacy requests? Email <Mail address="hi@shak-tech.com" />.
        </P>
      </Section>
    </LegalPage>
  );
}
