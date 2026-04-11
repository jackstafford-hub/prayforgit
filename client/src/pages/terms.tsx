import { Navbar } from "@/components/navbar";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/auth">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>

        <article className="prose prose-lg max-w-none">
          <h1 className="font-serif text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: February 2026</p>

          <p>
            Welcome to PrayForChange.org. By accessing or using our platform, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our service.
          </p>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">1. About the Service</h2>
          <p>
            PrayForChange.org is a community-driven platform that allows users to submit prayer requests, participate in collective prayer and share spiritual support. The platform uses artificial intelligence to help generate prayer content based on user submissions.
          </p>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">2. User Accounts</h2>
          <p>
            To use certain features of the platform, you must create an account by providing a valid email address and password. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
          </p>
          <p>
            You agree to provide accurate and complete information when creating your account and to update your information as necessary. We reserve the right to suspend or terminate accounts that violate these terms.
          </p>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">3. Acceptable Use</h2>
          <p>You agree not to use PrayForChange.org to:</p>
          <ul>
            <li>Post content that is hateful, discriminatory, threatening or harassing</li>
            <li>Submit fraudulent or misleading prayer requests</li>
            <li>Impersonate any person or entity</li>
            <li>Distribute spam or unsolicited communications</li>
            <li>Attempt to gain unauthorised access to the platform or other users' accounts</li>
            <li>Use the platform for any unlawful purpose</li>
          </ul>
          <p>
            We reserve the right to remove any content that violates these guidelines and to suspend or terminate the accounts of users who repeatedly breach these terms.
          </p>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">4. User Content</h2>
          <p>
            When you submit a prayer request or other content to PrayForChange.org, you retain ownership of your original content. However, by submitting content, you grant us a non-exclusive, worldwide, royalty-free licence to display, distribute and use that content in connection with operating and promoting the platform.
          </p>
          <p>
            You are solely responsible for the content you submit and represent that you have the right to share it.
          </p>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">5. AI-Generated Content</h2>
          <p>
            PrayForChange.org uses artificial intelligence to generate prayer summaries, recitable prayers and images based on user submissions. While we strive for quality and appropriateness, AI-generated content may not always perfectly reflect your intentions. You have the opportunity to review and edit AI-generated content before it is published.
          </p>
          <p>
            We do not guarantee the accuracy, completeness or suitability of any AI-generated content. AI-generated prayers and summaries are provided as a creative aid and should not be considered professional spiritual, medical or psychological advice.
          </p>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">6. Donations</h2>
          <p>
            PrayForChange.org may offer the option to make voluntary donations to support the platform. All donations are processed securely through Stripe and are non-refundable unless required by applicable law. Donations are used to support the hosting, development and maintenance of the platform.
          </p>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">7. Disclaimer</h2>
          <p>
            PrayForChange.org is a platform for spiritual support and community prayer. It is not a substitute for professional medical, psychological or legal advice. If you are experiencing a medical or mental health emergency, please contact the appropriate emergency services in your area.
          </p>
          <p>
            The platform is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the service will be uninterrupted, secure or error-free.
          </p>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">8. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, PrayForChange.org and its operators shall not be liable for any indirect, incidental, special, consequential or punitive damages arising from your use of or inability to use the platform, including but not limited to loss of data, loss of goodwill or any other intangible losses.
          </p>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">9. Modifications</h2>
          <p>
            We may update these Terms of Service from time to time. When we do, we will revise the "Last updated" date at the top of this page. Your continued use of the platform after any changes constitutes your acceptance of the revised terms.
          </p>

          <h2 className="font-serif text-2xl font-bold mt-10 mb-4">10. Contact</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at <a href="mailto:support@prayforchange.org" className="text-primary hover:underline">support@prayforchange.org</a>.
          </p>
        </article>
      </div>
    </div>
  );
}
