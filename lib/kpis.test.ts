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

  it('excludes one-time purchases from MRR — they are not recurring revenue', () => {
    // The actual bug this guards against: Quick Pass and Pro are billing:
    // 'one-time', but the old formula only branched on billing === 'yearly'
    // vs "else, treat as monthly" — a one-time purchase fell into that else
    // branch and got counted as if its full amount recurred every month for
    // as long as the subscription doc stayed active (a single ₹250 Quick
    // Pass inflating "Monthly Revenue" by ₹250/mo indefinitely). This is
    // what made the Dashboard's MRR disagree with the Purchases page's
    // honest Lifetime/Active Revenue sums.
    const result = computeSubscriptionMrrContribution(
      { plan: 'quick_pass', status: 'active', amount: 250, billing: 'one-time' },
      fallbackPrice
    );
    expect(result).toEqual({ plan: 'quick_pass', monthlyEquivalent: 0 });
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

  it('still counts a real payer whose plan an admin later adjusted', () => {
    // The actual bug this test guards against: /api/users/upgrade stamps
    // adminGranted:true on EVERY admin plan write, even a small adjustment
    // to a customer who genuinely paid via Razorpay. Without paymentId as a
    // durable signal, this real payer's MRR would silently vanish the
    // moment an admin touched their plan for any unrelated reason.
    const result = computeSubscriptionMrrContribution(
      { plan: 'pro', status: 'active', amount: 499, billing: 'monthly', adminGranted: true, paymentId: 'pay_real123' },
      fallbackPrice
    );
    expect(result).toEqual({ plan: 'pro', monthlyEquivalent: 499 });
  });

  it('excludes a pure comp with neither a real paymentId nor an explicit revenue flag', () => {
    const result = computeSubscriptionMrrContribution(
      { plan: 'power', status: 'active', amount: 999, billing: 'monthly', adminGranted: true, paymentId: null },
      fallbackPrice
    );
    expect(result).toBeNull();
  });
});
