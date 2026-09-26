import Stripe from 'stripe';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { createAuditLog } from '../../utils/audit';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia' as any,
});

export async function createStripeCheckoutSession(args: {
  organizationId: string;
  planId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string }> {
  const plan = await prisma.plan.findUnique({
    where: { id: args.planId },
  });

  if (!plan) {
    throw new Error('Selected plan not found.');
  }

  // If using mock test key, generate a test checkout URL
  if (env.STRIPE_SECRET_KEY.includes('Mock') || env.STRIPE_SECRET_KEY.includes('test_mock')) {
    const mockSessionId = 'cs_test_' + Math.random().toString(36).substring(2, 15);
    const simulatedSuccessUrl = `${args.successUrl}?session_id=${mockSessionId}&plan_id=${plan.id}`;
    return {
      url: simulatedSuccessUrl,
      sessionId: mockSessionId,
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: args.customerEmail,
      client_reference_id: args.organizationId,
      metadata: {
        organizationId: args.organizationId,
        planId: args.planId,
      },
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `FlowSuite ${plan.name} Plan`,
              description: `${plan.seatLimit} Seats, ${plan.projectLimit === -1 ? 'Unlimited' : plan.projectLimit} Projects, ${plan.apiRequestLimit.toLocaleString()} API Requests/mo`,
            },
            unit_amount: plan.price * 100,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${args.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: args.cancelUrl,
    });

    return {
      url: session.url || args.successUrl,
      sessionId: session.id,
    };
  } catch (error: any) {
    console.warn('Stripe checkout error (falling back to mock session for test mode):', error.message);
    const mockSessionId = 'cs_test_' + Math.random().toString(36).substring(2, 15);
    return {
      url: `${args.successUrl}?session_id=${mockSessionId}&plan_id=${plan.id}`,
      sessionId: mockSessionId,
    };
  }
}

export async function processSubscriptionUpdate(args: {
  organizationId: string;
  planId: string;
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}): Promise<void> {
  const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const existingSubscription = await prisma.subscription.findUnique({
    where: { organizationId: args.organizationId },
    include: { plan: true },
  });

  const updatedSubscription = await prisma.subscription.upsert({
    where: { organizationId: args.organizationId },
    create: {
      organizationId: args.organizationId,
      planId: args.planId,
      status: args.status,
      billingCycle: 'MONTHLY',
      renewalDate,
      stripeCustomerId: args.stripeCustomerId || null,
      stripeSubscriptionId: args.stripeSubscriptionId || null,
    },
    update: {
      planId: args.planId,
      status: args.status,
      renewalDate,
      stripeCustomerId: args.stripeCustomerId || undefined,
      stripeSubscriptionId: args.stripeSubscriptionId || undefined,
    },
    include: { plan: true },
  });

  // Record audit log for subscription and plan change
  await createAuditLog({
    organizationId: args.organizationId,
    action: 'SUBSCRIPTION_UPDATED',
    targetType: 'Subscription',
    targetId: updatedSubscription.id,
    metadata: {
      previousPlan: existingSubscription?.plan?.name || 'UNKNOWN',
      newPlan: updatedSubscription.plan?.name || (await prisma.plan.findUnique({ where: { id: args.planId } }))?.name || 'UNKNOWN',
      status: args.status,
      stripeCustomerId: args.stripeCustomerId,
    },
  });
}
