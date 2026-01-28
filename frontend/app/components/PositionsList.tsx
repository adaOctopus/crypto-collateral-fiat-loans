'use client';

// Component displaying user's collateral positions with stats
import { Position } from '../lib/types';

interface PositionsListProps {
  positions: Position[];
  loading: boolean;
  onRefresh: () => void;
}

export function PositionsList({ positions, loading, onRefresh }: PositionsListProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading positions...</p>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-hover">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
          No Positions Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Lock your first collateral to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {positions.map((position) => (
        <PositionCard key={position._id} position={position} />
      ))}
    </div>
  );
}

function PositionCard({ position }: { position: Position }) {
  const collateralRatio = position.collateralRatio / 100;
  const isHealthy = collateralRatio >= 1.2;

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-hover p-4 sm:p-6 hover:shadow-lg dark:hover:shadow-xl transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            {position.tokenSymbol} Position #{position.positionId}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {position.isActive ? 'Active' : 'Closed'}
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium self-start ${
            isHealthy
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 dark:border dark:border-green-800'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 dark:border dark:border-red-800'
          }`}
        >
          {collateralRatio.toFixed(1)}% Ratio
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <StatItem
          label="Collateral Amount"
          value={`${parseFloat(position.amount) / 1e18} ${position.tokenSymbol}`}
        />
        <StatItem
          label="Loan Amount"
          value={`$${parseFloat(position.loanAmountUSD) / 1e18}`}
        />
        <StatItem
          label="Collateral Ratio"
          value={`${collateralRatio.toFixed(1)}%`}
        />
      </div>

      <div className="border-t border-gray-200 dark:border-dark-hover pt-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Payment Status
        </h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Paid: {position.paymentStats.paid}/{position.paymentStats.total}
          </span>
          {position.paymentStats.late > 0 && (
            <span className="text-red-600 dark:text-red-400">
              Late: {position.paymentStats.late}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
