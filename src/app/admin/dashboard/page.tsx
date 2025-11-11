'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ArrowUpIcon, ArrowDownIcon, Users, CreditCard, Activity, DollarSign } from 'lucide-react'

// Sample data - replace with real data from your API
const stats = [
  {
    title: 'Total Revenue',
    value: '$45,231.89',
    change: '+20.1%',
    trend: 'up',
    icon: DollarSign,
  },
  {
    title: 'Subscriptions',
    value: '+2,350',
    change: '+180.1%',
    trend: 'up',
    icon: Users,
  },
  {
    title: 'Sales',
    value: '+12,234',
    change: '+19%',
    trend: 'up',
    icon: CreditCard,
  },
  {
    title: 'Active Now',
    value: '+573',
    change: '+201',
    trend: 'up',
    icon: Activity,
  },
]

const recentSales = [
  {
    name: 'Olivia Martin',
    email: 'olivia.martin@email.com',
    amount: '+$1,999.00',
    avatar: 'https://avatar.vercel.sh/olivia',
  },
  {
    name: 'Jackson Lee',
    email: 'jackson.lee@email.com',
    amount: '+$39.00',
    avatar: 'https://avatar.vercel.sh/jackson',
  },
  {
    name: 'Isabella Nguyen',
    email: 'isabella.nguyen@email.com',
    amount: '+$299.00',
    avatar: 'https://avatar.vercel.sh/isabella',
  },
  {
    name: 'William Kim',
    email: 'will@email.com',
    amount: '+$99.00',
    avatar: 'https://avatar.vercel.sh/william',
  },
  {
    name: 'Sofia Davis',
    email: 'sofia.davis@email.com',
    amount: '+$39.00',
    avatar: 'https://avatar.vercel.sh/sofia',
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {stat.trend === 'up' ? (
                    <ArrowUpIcon className="mr-1 h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownIcon className="mr-1 h-3 w-3 text-red-500" />
                  )}
                  <span className={stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                    {stat.change}
                  </span>
                  <span className="ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Sales & Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Overview Card */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Chart component placeholder - integrate with Recharts or similar
            </div>
          </CardContent>
        </Card>

        {/* Recent Sales Card */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>You made 265 sales this month.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {recentSales.map((sale) => (
                <div key={sale.email} className="flex items-center">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={sale.avatar} alt={sale.name} />
                    <AvatarFallback>{sale.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{sale.name}</p>
                    <p className="text-sm text-muted-foreground">{sale.email}</p>
                  </div>
                  <div className="ml-auto font-medium">{sale.amount}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest platform activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="rounded-full">
                New
              </Badge>
              <div className="flex-1">
                <p className="text-sm font-medium">New user registered</p>
                <p className="text-xs text-muted-foreground">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="rounded-full">
                Update
              </Badge>
              <div className="flex-1">
                <p className="text-sm font-medium">Database backup completed</p>
                <p className="text-xs text-muted-foreground">1 hour ago</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="rounded-full">
                Success
              </Badge>
              <div className="flex-1">
                <p className="text-sm font-medium">Payment processed successfully</p>
                <p className="text-xs text-muted-foreground">3 hours ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
