import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Check,
  Zap,
  ShieldCheck,
  Calendar,
  Sparkles,
  ExternalLink,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';

export const BillingPage: React.FC = () => {
  const { currentOrg, hasRole, refreshUserData } = useAuth();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const queryClient = useQueryClient();

  const [isProcessingStripe, setIsProcessingStripe] = useState(false);

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<{ plans: any[] }>('/plans'),
  });

  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ['subscription', currentOrg?.id],
    queryFn: () => api.get<{ subscription: any; entitlements: any }>('/subscription'),
  });

  // Stripe Checkout Mutation
  const checkoutMutation = useMutation({
    mutationFn: (planId: string) =>
      api.post<{ url: string; sessionId: string }>('/billing/checkout', { planId }),
    onSuccess: (data) => {
      if (data.url) {
        toastInfo('Redirecting to Stripe Test Checkout...');
        window.location.href = data.url;
      }
    },
    onError: (err: any) => toastError(err.message || 'Failed to initiate checkout.'),
  });

  // 1-Click Simulation Mutation (for testing without leaving app)
  const simulateMutation = useMutation({
    mutationFn: (planName: string) =>
      api.post<any>('/billing/simulate', { planName }),
    onSuccess: (data) => {
      toastSuccess(data.message || 'Subscription updated!');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });
      refreshUserData();
    },
    onError: (err: any) => toastError(err.message || 'Simulation failed.'),
  });

  const plans = plansData?.plans || [];
  const currentSub = subData?.subscription;
  const entitlements = subData?.entitlements;
  const currentPlanName = entitlements?.planName || currentOrg?.plan || 'FREE';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800/80">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <CreditCard className="w-6 h-6 text-brand-400" />
          Subscription & Billing
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Scale your workspace with transparent pricing, automated limit expansions, and Stripe test billing.
        </p>
      </div>

      {/* Current Subscription Status Banner */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Subscription</span>
            <Badge variant="brand">
              <Check className="w-3 h-3" />
              {currentSub?.status || 'ACTIVE'}
            </Badge>
          </div>
          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              {currentPlanName} Plan
            </h2>
            <span className="text-sm text-slate-400">
              ₹{entitlements?.planPrice || 0}/month
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-2 pt-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            Renews on:{' '}
            <span className="text-slate-200 font-mono">
              {currentSub?.renewalDate
                ? new Date(currentSub.renewalDate).toLocaleDateString()
                : 'Next Month'}
            </span>
          </p>
        </div>

        {/* Dynamic Entitlements summary chips */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Team Seats</span>
            <span className="font-semibold text-slate-200">{entitlements?.seatLimit || 3} Max</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Projects Quota</span>
            <span className="font-semibold text-slate-200">
              {entitlements?.isUnlimitedProjects ? 'Unlimited' : `${entitlements?.projectLimit || 2} Max`}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">API Limit</span>
            <span className="font-semibold text-slate-200">
              {(entitlements?.apiRequestLimit || 1000).toLocaleString()}/mo
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Adv. Analytics</span>
            <span className={`font-semibold ${entitlements?.advancedAnalytics ? 'text-emerald-400' : 'text-slate-500'}`}>
              {entitlements?.advancedAnalytics ? 'Included' : 'Not Included'}
            </span>
          </div>
        </div>
      </div>

      {/* Plan Tier Pricing Cards */}
      <div>
        <div className="text-center max-w-xl mx-auto mb-8">
          <h3 className="text-lg font-bold text-white">Choose the right plan for your business</h3>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic Entitlement Engine immediately reconfigures quota and unlocks features upon checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrent = p.name === currentPlanName;
            const isPro = p.name === 'PROFESSIONAL';

            return (
              <div
                key={p.id}
                className={`glass-card p-6 rounded-2xl border transition-all flex flex-col justify-between relative ${
                  isPro
                    ? 'border-brand-500/40 shadow-glow bg-slate-900/80'
                    : isCurrent
                    ? 'border-slate-700 bg-slate-900/60'
                    : 'border-slate-800/80'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-brand-400 to-emerald-400 text-slate-950 shadow-md">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-lg text-white">{p.name}</h4>
                    {isCurrent && (
                      <Badge variant="brand" size="sm">
                        Current
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-3xl font-extrabold text-white">₹{p.price}</span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-3 text-xs text-slate-300 mb-6">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><strong>{p.seatLimit}</strong> Team Seats</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>{p.projectLimit === -1 ? 'Unlimited' : p.projectLimit}</strong> Active Projects
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>{p.apiRequestLimit.toLocaleString()}</strong> API Requests / mo
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check
                        className={`w-4 h-4 shrink-0 ${
                          p.advancedAnalytics ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                      />
                      <span className={p.advancedAnalytics ? 'text-slate-200' : 'text-slate-500'}>
                        Advanced Analytics & Metrics
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Audit Activity Logs</span>
                    </li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-4 border-t border-slate-800/80">
                  {isCurrent ? (
                    <div className="w-full py-2.5 text-center text-xs font-semibold text-slate-400 bg-slate-900 rounded-xl border border-slate-800">
                      Current Plan
                    </div>
                  ) : hasRole(['OWNER']) ? (
                    <>
                      <button
                        onClick={() => checkoutMutation.mutate(p.id)}
                        disabled={checkoutMutation.isPending}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-brand-400 to-emerald-400 hover:from-brand-300 hover:to-emerald-300 transition-all shadow-glow flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Pay with Stripe Checkout
                      </button>

                      <button
                        onClick={() => simulateMutation.mutate(p.name)}
                        disabled={simulateMutation.isPending}
                        className="w-full py-1.5 px-3 rounded-lg text-[11px] font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"
                      >
                        <Zap className="w-3 h-3 text-amber-400" />
                        1-Click Test Upgrade ({p.name})
                      </button>
                    </>
                  ) : (
                    <div className="w-full py-2 text-center text-[11px] text-slate-500 bg-slate-900/60 rounded-lg">
                      Only Organization OWNER can change plans
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
