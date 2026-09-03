import { describe, it, expect } from 'vitest';
import { computeSubscriptionMrrContribution } from './kpis';

const fallbackPrice = { quick_pass: 99, pro: 499, power: 999 };

describe('computeSubscriptionMrrContribution', () => {
  it('counts a monthly-billed subscription at its full stored amount', () => {
    const result = computeSubscriptionMrrContribution(
      { plan: 'pro', status: 'active', amount: 599, billing: 'monthly' },
      fallbackPrice
    );
    expect(result).toEqual({ plan: 'pro', monthlyEquivalent: 599 });
  });

  it('divides a yearly-billed subscription by 12 for its monthly equivalent', () => {
    const result = computeSubscriptionMrrContribution(
      { plan: 'power', status: 'active', amount: 9600, billing: 'yearly' },
      fallbackPrice
    );
    expect(result).toEqual({ plan: 'power', monthlyEquivalent: 800 });
  });

  it('never uses the live pricing config when a stored amount exists, even if it now differs from current pricing', () => {
    // The whole point of this rule: a subscriber locked in at an old price
    // must keep showing that price after admin changes the live config.
    const result = computeSubscriptionMrrContribution(
      { plan: 'pro', status: 'active', amount: 299, billing: 'monthly' },
      { ...fallbackPrice, pro: 999 } // current live price is now much higher
    );
    expect(result?.monthlyEquivalent).toBe(299);
  });

  it('falls back to live pricing only for legacy subscriptions with no stored amount', () => {
    const result = computeSubscriptionMrrContribution(
      { plan: 'pro', status: 'active' }, // no amount field at all
      fallbackPrice
    );
    expect(result).toEqual({ plan: 'pro', monthlyEquivalent: 499 });
  });

  it('excludes inactive subscriptions', () => {
    const result = computeSubscriptionMrrContribution(
      { plan: 'pro', status: 'cancelled', amount: 499, billing: 'monthly' },
      fallbackPrice
    );
    expect(result).toBeNull();
  });

  it('excludes subscriptions on an unrecognized plan', () => {
    const result = computeSubscriptionMrrContribution(
      { plan: 'enterprise', status: 'active', amount: 5000 },
      fallbackPrice
    );
    expect(result).toBeNull();
  });

  it('excludes an admin-granted comp unless explicitly flagged to count toward revenue', () => {
    const result = computeSubscriptionMrrContribution(
      { plan: 'power', status: 'active', amount: 999, billing: 'monthly', adminGranted: true },
      fallbackPrice
    );
    expect(result).toBeNull();
  });

  it('includes an admin-granted comp when countTowardRevenue is explicitly true', () => {
    const result = computeSubscriptionMrrContribution(
      { plan: 'power', status: 'active', amount: 999, billing: 'monthly', adminGranted: true, countTowardRevenue: true },
      fallbackPrice
    );
    expect(result).toEqual({ plan: 'power', monthlyEquivalent: 999 });
  });
});
