import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { createStripeCheckoutSession, processSubscriptionUpdate, stripe } from './stripe.service';
import { getOrganizationEntitlements } from '../../utils/entitlements';

export async function getPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { price: 'asc' },
    });
    res.status(200).json({ plans });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.tenant!;

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });

    const entitlements = await getOrganizationEntitlements(organizationId);

    res.status(200).json({
      subscription: subscription || null,
      entitlements,
    });
  } catch (error) {
    next(error);
  }
}

export async function createCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.tenant!;
    const userEmail = req.user!.email;
    const { planId, successUrl, cancelUrl } = req.body;

    const defaultSuccess = `${env.CLIENT_URL}/billing?session_id={CHECKOUT_SESSION_ID}&success=true`;
    const defaultCancel = `${env.CLIENT_URL}/billing?canceled=true`;

    const session = await createStripeCheckoutSession({
      organizationId,
      planId,
      customerEmail: userEmail,
      successUrl: successUrl || defaultSuccess,
      cancelUrl: cancelUrl || defaultCancel,
    });

    res.status(200).json({
      url: session.url,
      sessionId: session.sessionId,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sig = req.headers['stripe-signature'] as string;
    let event: any = req.body;

    // Verify webhook signature if real secret is configured
    if (sig && env.STRIPE_WEBHOOK_SECRET && !env.STRIPE_WEBHOOK_SECRET.includes('mock')) {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
      } catch (err: any) {
        throw new AppError(`Webhook Error: ${err.message}`, 'BAD_REQUEST', 400);
      }
    }

    const eventType = event.type;
    const dataObject = event.data?.object;

    if (eventType === 'checkout.session.completed') {
      const organizationId = dataObject.client_reference_id || dataObject.metadata?.organizationId;
      const planId = dataObject.metadata?.planId;
      const stripeCustomerId = dataObject.customer;
      const stripeSubscriptionId = dataObject.subscription;

      if (organizationId && planId) {
        await processSubscriptionUpdate({
          organizationId,
          planId,
          status: 'ACTIVE',
          stripeCustomerId,
          stripeSubscriptionId,
        });
      }
    } else if (
      eventType === 'customer.subscription.updated' ||
      eventType === 'invoice.payment_succeeded'
    ) {
      const stripeSubscriptionId = dataObject.id || dataObject.subscription;
      const subscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId },
      });

      if (subscription) {
        await processSubscriptionUpdate({
          organizationId: subscription.organizationId,
          planId: subscription.planId,
          status: 'ACTIVE',
          stripeSubscriptionId,
        });
      }
    } else if (eventType === 'customer.subscription.deleted') {
      const stripeSubscriptionId = dataObject.id;
      const subscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId },
      });

      if (subscription) {
        const freePlan = await prisma.plan.findUnique({ where: { name: 'FREE' } });
        if (freePlan) {
          await processSubscriptionUpdate({
            organizationId: subscription.organizationId,
            planId: freePlan.id,
            status: 'CANCELLED',
          });
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
}

export async function simulatePlanChange(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.tenant!;
    const { planName } = req.body;

    const targetPlan = await prisma.plan.findUnique({
      where: { name: planName },
    });

    if (!targetPlan) {
      throw new AppError(`Plan '${planName}' not found.`, 'NOT_FOUND', 404);
    }

    await processSubscriptionUpdate({
      organizationId,
      planId: targetPlan.id,
      status: 'ACTIVE',
      stripeCustomerId: 'cus_simulated_' + Math.random().toString(36).substring(2, 8),
      stripeSubscriptionId: 'sub_simulated_' + Math.random().toString(36).substring(2, 8),
    });

    const updatedEntitlements = await getOrganizationEntitlements(organizationId);

    res.status(200).json({
      message: `Successfully switched to ${planName} plan.`,
      plan: targetPlan,
      entitlements: updatedEntitlements,
    });
  } catch (error) {
    next(error);
  }
}
