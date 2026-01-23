// Landing page with hero section and call-to-action
import Link from 'next/link';
import { Button } from './components/Button';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="relative container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
              Unlock Liquidity
              <br />
              <span className="text-primary-200">Without Selling Crypto</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100 max-w-2xl mx-auto">
              Lock your cryptocurrency as collateral and receive fiat currency loans
              to your bank account. Keep your holdings while accessing liquidity.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/app">
                <Button size="lg" className="bg-white text-primary-700 hover:bg-primary-50">
                  Get Started
                </Button>
              </Link>
              <Link href="/app">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            Why Choose Collateral Crypto?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            How It Works
          </h2>
          <div className="max-w-4xl mx-auto space-y-8">
            <Step number={1} title="Connect Wallet" description="Connect your Web3 wallet to get started." />
            <Step number={2} title="Lock Collateral" description="Deposit your crypto assets to the secure smart contract." />
            <Step number={3} title="Receive Loan" description="Get fiat currency transferred to your bank account." />
            <Step number={4} title="Make Payments" description="Pay monthly interest and unlock portions of your collateral." />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-primary-100">
            Join thousands of users who are accessing liquidity without selling their crypto.
          </p>
          <Link href="/app">
            <Button size="lg" className="bg-white text-primary-700 hover:bg-primary-50">
              Launch App
            </Button>
          </Link>
        </div>
      </section>
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
    <div className="p-6 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
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
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-xl">
        {number}
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300">{description}</p>
      </div>
    </div>
  );
}
