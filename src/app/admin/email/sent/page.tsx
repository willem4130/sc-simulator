'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Send, CheckCircle2, XCircle, Clock, Mail, ExternalLink, Loader2 } from 'lucide-react'
import { api } from '@/trpc/react'
import Link from 'next/link'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

type EmailStatus = 'PENDING' | 'SENT' | 'FAILED'

const statusConfig: Record<EmailStatus, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  PENDING: { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Wachtend' },
  SENT: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Verzonden' },
  FAILED: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Mislukt' },
}

function StatusBadge({ status }: { status: EmailStatus }) {
  const config = statusConfig[status]
  const Icon = config.icon
  return (
    <Badge variant="outline" className={`${config.bgColor} ${config.color} border-0`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}

export default function SentEmailsPage() {
  const { data: emails, isLoading } = api.projectEmails.getAllSentEmails.useQuery({})
  const { data: stats } = api.projectEmails.getAllSentEmailStats.useQuery()

  const filterEmailsByStatus = (status?: EmailStatus) => {
    if (!emails) return []
    if (!status) return emails
    return emails.filter((e) => e.status === status)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verzonden E-mails</h1>
        <p className="text-muted-foreground">
          Overzicht van alle verzonden e-mails en hun status
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totaal Verzonden</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total ?? '-'}</div>
            <p className="text-xs text-muted-foreground">Alle e-mails</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Succesvol</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sent ?? '-'}</div>
            <p className="text-xs text-muted-foreground">Afgeleverd</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mislukt</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.failed ?? '-'}</div>
            <p className="text-xs text-muted-foreground">Niet afgeleverd</p>
          </CardContent>
        </Card>
      </div>

      {/* Emails Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            <CardTitle>E-mail Geschiedenis</CardTitle>
          </div>
          <CardDescription>
            Alle verzonden e-mails met status en details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !emails || emails.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Geen e-mails gevonden</p>
              <p className="text-sm">
                Er zijn nog geen e-mails verzonden vanuit het systeem.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">Alle ({emails.length})</TabsTrigger>
                <TabsTrigger value="sent">
                  Verzonden ({filterEmailsByStatus('SENT').length})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Wachtend ({filterEmailsByStatus('PENDING').length})
                </TabsTrigger>
                <TabsTrigger value="failed">
                  Mislukt ({filterEmailsByStatus('FAILED').length})
                </TabsTrigger>
              </TabsList>

              {['all', 'sent', 'pending', 'failed'].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Ontvanger</TableHead>
                        <TableHead>Onderwerp</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterEmailsByStatus(
                        tab === 'all' ? undefined : (tab.toUpperCase() as EmailStatus)
                      ).map((email) => (
                        <TableRow key={email.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(email.createdAt), 'd MMM yyyy HH:mm', {
                              locale: nl,
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{email.user.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {email.toEmail}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {email.subject}
                          </TableCell>
                          <TableCell>
                            {email.project ? (
                              <Link
                                href={`/admin/projects/${email.project.id}`}
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {email.project.projectNumber || email.project.name}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {email.template ? (
                              <Badge variant="outline">{email.template.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={email.status} />
                            {email.error && (
                              <p className="text-xs text-red-600 mt-1 max-w-[150px] truncate">
                                {email.error}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
