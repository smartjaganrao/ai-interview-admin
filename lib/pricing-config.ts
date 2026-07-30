export type PlanId = 'free' | 'quick_pass' | 'pro' | 'power';
export type LegacyPlanId = 'free' | 'starter' | 'standard' | 'pro' | 'power';
export type AnyPlanId = PlanId | LegacyPlanId;
export type BillingType = 'one_time' | 'subscription';
export type DurationType = 'hours' | 'days' | 'month';

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  price: number;
  billingType: BillingType;
  durationType: DurationType;
  durationValue: number;
  usageLimit: number | null;
  isUnlimited: boolean;
  features: string[];
  badge: string | null;
  isHighlighted: boolean;
  isActive: boolean;
  displayOrder: number;
  emoji: string;
  gradient: string;
  tagline: string;
  cta: string;
}

export const PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Explore core features with limited usage',
    price: 0,
    billingType: 'one_time',
    durationType: 'days',
    durationValue: 0,
    usageLimit: null,
    isUnlimited: false,
    features: [
      'Limited AI usage',
      'Explore core features',
      'Limited trial experience',
    ],
    badge: null,
    isHighlighted: false,
    isActive: true,
    displayOrder: 0,
    emoji: '🎯',
    gradient: 'from-slate-600 to-slate-700',
    tagline: 'Try it out',
    cta: 'Start Free',
  },
  {
    id: 'quick_pass',
    name: 'Quick Pass',
    description: '1-hour full access pass',
    price: 99,
    billingType: 'one_time',
    durationType: 'hours',
    durationValue: 1,
    usageLimit: 1,
    isUnlimited: false,
    features: [
      'Full AI Interview Assistant',
      'Voice Mode',
      'Screen Mode',
      'Coding Interview Support',
      'HR Interview Support',
    ],
    badge: null,
    isHighlighted: false,
    isActive: true,
    displayOrder: 1,
    emoji: '🎟️',
    gradient: 'from-emerald-500 to-teal-600',
    tagline: 'Best for interview day',
    cta: 'Buy Now',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: '5-hour deep practice pass',
    price: 499,
    billingType: 'one_time',
    durationType: 'hours',
    durationValue: 5,
    usageLimit: 5,
    isUnlimited: false,
    features: [
      'AI Interview Assistant',
      'Voice Mode',
      'Screen Mode',
      'Coding Interview Support',
      'HR Interview Support',
      'Resume Analysis',
      'Company-specific interview support',
    ],
    badge: null,
    isHighlighted: false,
    isActive: true,
    displayOrder: 2,
    emoji: '🚀',
    gradient: 'from-blue-500 to-cyan-600',
    tagline: 'For regular interviewers',
    cta: 'Buy Now',
  },
  {
    id: 'power',
    name: 'Power',
    description: 'Unlimited monthly subscription',
    price: 999,
    billingType: 'subscription',
    durationType: 'month',
    durationValue: 1,
    usageLimit: null,
    isUnlimited: true,
    features: [
      'Everything in Pro',
      'Unlimited Usage',
      'AI Mock Interview',
      'AI Interview Evaluation',
      'AI Interview Score',
      'Performance Analytics',
      'Personalized Improvement Plan',
      'Priority Support',
      'Early Access Features',
    ],
    badge: '⭐ Best Value',
    isHighlighted: true,
    isActive: true,
    displayOrder: 3,
    emoji: '⚡',
    gradient: 'from-purple-600 to-pink-600',
    tagline: 'Maximum advantage',
    cta: 'Start Subscription',
  },
];

export const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  quick_pass: 1,
  pro: 2,
  power: 3,
};

export const PLAN_MIGRATION: Record<LegacyPlanId, PlanId> = {
  free: 'free',
  starter: 'quick_pass',
  standard: 'pro',
  pro: 'power',
  power: 'power',
};

export function migratePlanId(plan: AnyPlanId): PlanId {
  if (plan === 'quick_pass' || plan === 'free' || plan === 'power') return plan;
  return PLAN_MIGRATION[plan as LegacyPlanId] ?? 'free';
}

export function getPlanById(id: AnyPlanId): PlanConfig | undefined {
  const planId = migratePlanId(id);
  return PLANS.find(p => p.id === planId);
}

export function isOneTimePlan(plan: AnyPlanId): boolean {
  const config = getPlanById(plan);
  return config ? config.billingType === 'one_time' : false;
}

export function getPlanHours(plan: AnyPlanId): number {
  const config = getPlanById(plan);
  return config ? config.durationValue : 0;
}

export function isUnlimitedPlan(plan: AnyPlanId): boolean {
  const config = getPlanById(plan);
  return config ? config.isUnlimited : false;
}

export function getPlanBadge(plan: AnyPlanId): string | null {
  const config = getPlanById(plan);
  return config ? config.badge : null;
}

export function isPlanHighlighted(plan: AnyPlanId): boolean {
  const config = getPlanById(plan);
  return config ? config.isHighlighted : false;
}

export function getPlanDisplayOrder(plan: AnyPlanId): number {
  const config = getPlanById(plan);
  return config ? config.displayOrder : 999;
}

export function getPlanFeatures(plan: AnyPlanId): string[] {
  const config = getPlanById(plan);
  return config ? config.features : [];
}

export function getPlanPrice(plan: AnyPlanId): number {
  const config = getPlanById(plan);
  return config ? config.price : 0;
}

export function getPlanName(plan: AnyPlanId): string {
  const config = getPlanById(plan);
  return config ? config.name : 'Free';
}

export function getPlanCta(plan: AnyPlanId): string {
  const config = getPlanById(plan);
  return config ? config.cta : 'Select';
}

export function getPlanEmoji(plan: AnyPlanId): string {
  const config = getPlanById(plan);
  return config ? config.emoji : '🎯';
}

export function getPlanGradient(plan: AnyPlanId): string {
  const config = getPlanById(plan);
  return config ? config.gradient : 'from-slate-600 to-slate-700';
}

export function getPlanTagline(plan: AnyPlanId): string {
  const config = getPlanById(plan);
  return config ? config.tagline : '';
}

export function getPlanUsageLabel(plan: AnyPlanId): string {
  const config = getPlanById(plan);
  if (!config) return '';
  if (config.id === 'free') return 'Limited trial';
  if (config.isUnlimited) return 'Unlimited Access';
  if (config.durationType === 'hours') return `${config.durationValue} Hour${config.durationValue !== 1 ? 's' : ''} Access`;
  if (config.durationType === 'days') return `${config.durationValue} Day${config.durationValue !== 1 ? 's' : ''} Access`;
  if (config.durationType === 'month') return `${config.durationValue} Month${config.durationValue !== 1 ? 's' : ''} Access`;
  return '';
}

export function canUpgradeTo(currentPlan: AnyPlanId, targetPlan: AnyPlanId): boolean {
  const current = migratePlanId(currentPlan);
  const target = migratePlanId(targetPlan);
  if (current === target) return false;
  if (current === 'free') return true;
  if (target === 'free') return false;
  const currentIsOneTime = isOneTimePlan(current);
  const targetIsOneTime = isOneTimePlan(target);
  if (currentIsOneTime && !targetIsOneTime) return true;
  if (!currentIsOneTime && targetIsOneTime) return false;
  return PLAN_RANK[target] > PLAN_RANK[current];
}

export function canDowngradeTo(currentPlan: AnyPlanId, targetPlan: AnyPlanId): boolean {
  const current = migratePlanId(currentPlan);
  const target = migratePlanId(targetPlan);
  if (current === target) return false;
  if (target === 'free') return true;
  if (current === 'free') return false;
  const currentIsOneTime = isOneTimePlan(current);
  const targetIsOneTime = isOneTimePlan(target);
  if (!currentIsOneTime && targetIsOneTime) return true;
  if (currentIsOneTime && !targetIsOneTime) return false;
  return PLAN_RANK[target] < PLAN_RANK[current];
}

export function isDowngrade(currentPlan: AnyPlanId, targetPlan: AnyPlanId): boolean {
  const current = migratePlanId(currentPlan);
  const target = migratePlanId(targetPlan);
  if (current === target) return false;
  if (target === 'free') return true;
  if (current === 'free') return false;
  const currentIsOneTime = isOneTimePlan(current);
  const targetIsOneTime = isOneTimePlan(target);
  if (!currentIsOneTime && targetIsOneTime) return true;
  if (currentIsOneTime && !targetIsOneTime) return false;
  return PLAN_RANK[target] < PLAN_RANK[current];
}

export function getPlanValidityLabel(plan: AnyPlanId): string {
  const config = getPlanById(plan);
  if (!config) return '';
  if (config.id === 'free') return 'Forever';
  if (config.billingType === 'subscription') return 'Monthly';
  if (config.durationType === 'hours') return `${config.durationValue} Hour${config.durationValue !== 1 ? 's' : ''}`;
  if (config.durationType === 'days') return `${config.durationValue} Day${config.durationValue !== 1 ? 's' : ''}`;
  return '';
}

export function getPlanBillingLabel(plan: AnyPlanId): string {
  const config = getPlanById(plan);
  if (!config) return '';
  if (config.id === 'free') return '—';
  return config.billingType === 'subscription' ? 'Monthly' : 'One-time';
}
