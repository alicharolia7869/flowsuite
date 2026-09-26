import { prisma } from '../config/prisma';

export interface Entitlements {
  planName: string;
  planPrice: number;
  seatLimit: number;
  projectLimit: number; // -1 = unlimited
  apiRequestLimit: number;
  advancedAnalytics: boolean;
  isUnlimitedProjects: boolean;
}

export class PlanLimitError extends Error {
  code = 'PLAN_LIMIT_REACHED';
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'PlanLimitError';
  }
}

/**
 * Resolves the dynamic entitlements for an organization through its active subscription and plan.
 * Never hardcodes checks like `if (plan === "Professional")`.
 */
export async function getOrganizationEntitlements(organizationId: string): Promise<Entitlements> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  });

  if (!subscription || !subscription.plan) {
    // Fallback to default FREE plan entitlements if subscription not initialized
    const freePlan = await prisma.plan.findUnique({ where: { name: 'FREE' } });
    return {
      planName: freePlan?.name || 'FREE',
      planPrice: freePlan?.price || 0,
      seatLimit: freePlan?.seatLimit || 3,
      projectLimit: freePlan?.projectLimit || 2,
      apiRequestLimit: freePlan?.apiRequestLimit || 1000,
      advancedAnalytics: freePlan?.advancedAnalytics || false,
      isUnlimitedProjects: (freePlan?.projectLimit || 2) === -1,
    };
  }

  const { plan } = subscription;
  return {
    planName: plan.name,
    planPrice: plan.price,
    seatLimit: plan.seatLimit,
    projectLimit: plan.projectLimit,
    apiRequestLimit: plan.apiRequestLimit,
    advancedAnalytics: plan.advancedAnalytics,
    isUnlimitedProjects: plan.projectLimit === -1,
  };
}

/**
 * Checks whether an action would exceed the organization's plan limit.
 * Throws PlanLimitError if limit is reached.
 */
export async function assertEntitlementLimit(
  organizationId: string,
  limitType: 'SEAT_LIMIT' | 'PROJECT_LIMIT' | 'API_REQUEST_LIMIT' | 'ADVANCED_ANALYTICS'
): Promise<void> {
  const entitlements = await getOrganizationEntitlements(organizationId);

  if (limitType === 'ADVANCED_ANALYTICS') {
    if (!entitlements.advancedAnalytics) {
      throw new PlanLimitError(
        'Advanced Analytics is only available on plans with the Advanced Analytics entitlement. Upgrade your plan to access this feature.'
      );
    }
    return;
  }

  if (limitType === 'SEAT_LIMIT') {
    const currentSeats = await prisma.membership.count({
      where: { organizationId },
    });
    if (currentSeats >= entitlements.seatLimit) {
      throw new PlanLimitError(
        `Your current plan allows a maximum of ${entitlements.seatLimit} seats. Upgrade your plan to add more members.`
      );
    }
    return;
  }

  if (limitType === 'PROJECT_LIMIT') {
    if (entitlements.isUnlimitedProjects) {
      return; // Unlimited allowed
    }
    const currentProjects = await prisma.project.count({
      where: { organizationId },
    });
    if (currentProjects >= entitlements.projectLimit) {
      throw new PlanLimitError(
        `Your current plan allows a maximum of ${entitlements.projectLimit} projects. Upgrade your plan to create more projects.`
      );
    }
    return;
  }

  if (limitType === 'API_REQUEST_LIMIT') {
    const counter = await prisma.usageCounter.findUnique({
      where: { organizationId },
    });
    const currentRequests = counter?.apiRequestsUsed || 0;
    if (currentRequests >= entitlements.apiRequestLimit) {
      throw new PlanLimitError(
        `Your monthly API request limit of ${entitlements.apiRequestLimit.toLocaleString()} requests has been reached. Upgrade your plan for higher throughput.`
      );
    }
    return;
  }
}
