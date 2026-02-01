// Landing page with hero section and call-to-action (Collateral Fusion)
import Link from 'next/link';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Button } from './components/Button';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-landing',
});

export default function Home() {
  return (
    <div className={`${plusJakarta.className} min-h-screen bg-white dark:bg-dark-bg antialiased`}>
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-gray-200/80 dark:border-dark-hover/80 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18">
            <span className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Collateral Fusion
            </span>
            <Link href="/app">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white dark:bg-dark-bg text-gray-900 dark:text-white">
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight text-gray-900 dark:text-white">
              Unlock Liquidity
              <br />
              <span className="text-primary-500">Without Selling Crypto</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl mb-10 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Lock your cryptocurrency as collateral and receive fiat currency loans
              to your bank account. Keep your holdings while accessing liquidity.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/app">
                <Button size="lg">
                  Get Started →
                </Button>
              </Link>
              <Link href="/app">
                <Button size="lg" variant="outline" className="dark:border-primary-500 dark:text-primary-500">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 bg-white dark:bg-dark-bg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white tracking-tight">
            Why Choose Collateral Fusion?
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-10 sm:mb-12">
            Borrow against your crypto with clarity and control.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            <FeatureCard
              title="No Need to Sell"
              description="Keep your crypto holdings while accessing fiat liquidity for your needs."
              icon="💰"
            />
            <FeatureCard
              title="Flexible Terms"
              description="Unlock portions of your collateral as you make interest payments."
              icon="🔓"
            />
            <FeatureCard
              title="Secure & Transparent"
              description="Smart contracts ensure your collateral is safe and transactions are transparent."
              icon="🔒"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 bg-gray-50 dark:bg-dark-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white tracking-tight">
            How It Works
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-10 sm:mb-12">
            Four simple steps to access liquidity.
          </p>
          <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
            <Step number={1} title="Connect Wallet" description="Connect your Web3 wallet to get started." />
            <Step number={2} title="Lock Collateral" description="Deposit your crypto assets to the secure smart contract." />
            <Step number={3} title="Receive Loan" description="Get fiat currency transferred to your bank account." />
            <Step number={4} title="Make Payments" description="Pay monthly interest and unlock portions of your collateral." />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-white dark:bg-dark-card text-gray-900 dark:text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto bg-white dark:bg-dark-bg rounded-2xl p-8 sm:p-12 border border-gray-200 dark:border-dark-hover shadow-sm dark:shadow-none">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 sm:mb-6 text-center tracking-tight text-gray-900 dark:text-white">
              Ready to Get Started?
            </h2>
            <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-gray-600 dark:text-gray-300 text-center leading-relaxed">
              Join thousands of users who are unlocking the value of their crypto assets. Start borrowing today and earn exclusive NFT rewards.
            </p>
            <div className="flex justify-center mb-6 sm:mb-8">
              <Link href="/app">
                <Button size="lg">
                  Launch Collateral Fusion →
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm sm:text-base text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-primary-500">✓</span> No Credit Check
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary-500">✓</span> Instant Approval
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary-500">✓</span> NFT Rewards
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary-500">✓</span> Trade Loans
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200 dark:border-dark-hover bg-white dark:bg-dark-bg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © 2025 Collateral Fusion. Unlock liquidity without selling.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="p-6 rounded-xl bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-hover hover:shadow-lg dark:hover:shadow-xl transition-all duration-200">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white tracking-tight">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-xl shadow-lg">
        {number}
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white tracking-tight">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
