import { Navbar } from "@/components/navbar";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/auth">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>

        <article className="prose prose-lg max-w-none">
          <h1 className="font-serif text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: February 2026</p>

          <p>
            PrayForChange.org is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it and what rights you have in relation to your data.
          </p>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">1. Information We Collect</h2>
          <p>When you use PrayForChange.org, we may collect the following information:</p>
          <ul>
            <li><strong>Account information:</strong> Your email address, first name, last name and a securely hashed password when you create an account.</li>
            <li><strong>Prayer content:</strong> The prayer requests you submit, including titles, descriptions and any personal context you provide.</li>
            <li><strong>Communication preferences:</strong> Whether you have opted in to receive email updates such as daily prayer digests and community news.</li>
            <li><strong>Usage data:</strong> Information about how you interact with the platform, such as prayer counts and pages visited.</li>
            <li><strong>Session data:</strong> We use cookies to maintain your login session. These are essential for the platform to function and are not used for tracking or advertising.</li>
          </ul>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide and operate the PrayForChange.org platform</li>
            <li>Create and manage your user account</li>
            <li>Generate AI-enhanced prayer content from your submissions</li>
            <li>Send transactional emails (such as welcome emails and prayer confirmations)</li>
            <li>Send daily digest emails and community updates, only if you have opted in</li>
            <li>Process voluntary donations through our payment provider</li>
            <li>Improve and maintain the platform</li>
          </ul>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">3. Third-Party Services</h2>
          <p>We use the following third-party services to operate the platform:</p>
          <ul>
            <li><strong>OpenAI:</strong> Your prayer title and description are sent to OpenAI's API to generate AI-enhanced prayer summaries, recitable prayers and images. OpenAI processes this data in accordance with their own privacy policy.</li>
            <li><strong>SendGrid:</strong> We use SendGrid to send transactional and opt-in marketing emails. Your email address and first name are shared with SendGrid for this purpose.</li>
            <li><strong>Stripe:</strong> If you choose to make a donation, your payment is processed securely by Stripe. We do not store your payment card details. Stripe processes your payment data in accordance with their privacy policy.</li>
          </ul>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">4. Email Communications</h2>
          <p>We send two types of email:</p>
          <ul>
            <li><strong>Transactional emails:</strong> These include welcome emails upon registration and prayer confirmation emails when you submit a prayer. These are sent automatically as part of the service and do not require separate consent.</li>
            <li><strong>Marketing emails:</strong> These include daily prayer digest updates and community news. These are only sent if you have explicitly opted in during registration. You can withdraw your consent at any time by contacting us.</li>
          </ul>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">5. Your Rights Under GDPR</h2>
          <p>If you are located in the European Economic Area, you have the following rights regarding your personal data:</p>
          <ul>
            <li><strong>Right of access:</strong> You can request a copy of the personal data we hold about you.</li>
            <li><strong>Right to rectification:</strong> You can request that we correct any inaccurate or incomplete data.</li>
            <li><strong>Right to erasure:</strong> You can request that we delete your personal data, subject to any legal obligations we may have to retain certain information.</li>
            <li><strong>Right to restrict processing:</strong> You can request that we limit how we use your data.</li>
            <li><strong>Right to data portability:</strong> You can request your data in a structured, commonly used format.</li>
            <li><strong>Right to object:</strong> You can object to the processing of your data for certain purposes, including marketing communications.</li>
            <li><strong>Right to withdraw consent:</strong> Where processing is based on your consent, you can withdraw that consent at any time.</li>
          </ul>
          <p>
            To exercise any of these rights, please contact us at <a href="mailto:support@prayforchange.org" className="text-primary hover:underline">support@prayforchange.org</a>.
          </p>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">6. Data Security</h2>
          <p>
            We take reasonable measures to protect your personal data, including encrypting passwords with bcrypt hashing, using secure HTTPS connections and storing session data securely. However, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security.
          </p>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">7. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active or as needed to provide you with the service. If you request deletion of your account, we will remove your personal data within a reasonable timeframe, unless we are required by law to retain certain information.
          </p>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">8. Children's Privacy</h2>
          <p>
            PrayForChange.org is not directed at children under the age of 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us and we will take steps to delete that information.
          </p>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top of this page. We encourage you to review this policy periodically to stay informed about how we protect your data.
          </p>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">10. Contact</h2>
          <p>
            If you have any questions about this Privacy Policy or wish to exercise your data protection rights, please contact us at <a href="mailto:support@prayforchange.org" className="text-primary hover:underline">support@prayforchange.org</a>.
          </p>
        </article>
      </div>
    </div>
  );
}
