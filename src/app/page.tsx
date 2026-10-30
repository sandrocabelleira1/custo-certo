
'use client';

import dynamic from 'next/dynamic';
import PageHeader from "@/components/page-header";
import { Skeleton } from '@/components/ui/skeleton';
import { useStore } from '@/components/auth/store-provider';

const DashboardStats = dynamic(() => import('@/components/dashboard/dashboard-stats'), { 
    ssr: false,
    loading: () => <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-[126px]" />
        <Skeleton className="h-[126px]" />
        <Skeleton className="h-[126px]" />
        <Skeleton className="h-[126px]" />
    </div>
});
const CmvChart = dynamic(() => import('@/components/dashboard/cmv-chart'), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[400px]" />,
});
const TradeChart = dynamic(() => import('@/components/dashboard/trade-chart'), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[400px]" />,
});
const PriceChart = dynamic(() => import('@/components/dashboard/price-chart'), {
  ssr: false, 
  loading: () => <Skeleton className="w-full h-[300px]" />,
});
const SpendingGoal = dynamic(() => import('@/components/dashboard/spending-goal'), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[300px]" />,
});
const ExpensesOverview = dynamic(() => import('@/components/dashboard/expenses-overview'), {
    ssr: false,
    loading: () => <div className="grid md:grid-cols-3 gap-6">
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px] md:col-span-2" />
    </div>,
});


export default function Dashboard() {
    const { currentStore } = useStore();

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Painel Principal"
            />
            
            <DashboardStats />

            <CmvChart />

            <TradeChart />

            <ExpensesOverview />
            
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <PriceChart />
                </div>
                <div className="md:col-span-1">
                    <SpendingGoal />
                </div>
            </div>
        </div>
    )
}
