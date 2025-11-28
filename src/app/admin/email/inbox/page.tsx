'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Mail,
  FileText,
  Receipt,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

type EmailType = 'INVOICE' | 'CONTRACT' | 'OTHER';

function formatDate(date: Date | string) {
  return new Date(date).toLocaleString('nl-NL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTypeIcon(type: EmailType | null) {
  if (type === 'INVOICE') return <Receipt className="h-4 w-4" />;
  if (type === 'CONTRACT') return <FileText className="h-4 w-4" />;
  return <Mail className="h-4 w-4" />;
}

function getTypeBadge(type: EmailType | null) {
  if (type === 'INVOICE') {
    return <Badge className="bg-green-500">Factuur</Badge>;
  }
  if (type === 'CONTRACT') {
    return <Badge className="bg-blue-500">Contract</Badge>;
  }
  return <Badge variant="secondary">Overig</Badge>;
}

export default function InboundEmailInboxPage() {
  const [selectedType, setSelectedType] = useState<EmailType | undefined>();

  const { data: stats } = api.inboundEmail.getStats.useQuery();
  const { data, isLoading, refetch } = api.inboundEmail.list.useQuery({
    type: selectedType,
    limit: 50,
  });

  const deleteMutation = api.inboundEmail.delete.useMutation({
    onSuccess: () => {
      toast.success('Email verwijderd');
      void refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(`Fout: ${error.message}`);
    },
  });

  const reprocessMutation = api.inboundEmail.reprocess.useMutation({
    onSuccess: () => {
      toast.success('Email opnieuw verwerkt');
      void refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(`Fout: ${error.message}`);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Inbox</h1>
          <p className="text-muted-foreground">
            Ontvangen facturen en contracten via email
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Ververs
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Totaal</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Onverwerkt</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unprocessed}</div>
            </CardContent>
          </Card>

          {stats.byType.map((item: { type: EmailType | null; count: number }) => (
            <Card key={item.type || 'null'}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {item.type === 'INVOICE'
                    ? 'Facturen'
                    : item.type === 'CONTRACT'
                      ? 'Contracten'
                      : 'Overig'}
                </CardTitle>
                {getTypeIcon(item.type)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.count}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Email List */}
      <Card>
        <CardHeader>
          <CardTitle>Ontvangen Emails</CardTitle>
          <CardDescription>
            Automatisch geclassificeerd en verwerkt met AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all" onClick={() => setSelectedType(undefined)}>
                Alle
              </TabsTrigger>
              <TabsTrigger value="invoices" onClick={() => setSelectedType('INVOICE')}>
                Facturen
              </TabsTrigger>
              <TabsTrigger value="contracts" onClick={() => setSelectedType('CONTRACT')}>
                Contracten
              </TabsTrigger>
              <TabsTrigger value="other" onClick={() => setSelectedType('OTHER')}>
                Overig
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : data && data.emails.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Geen emails gevonden
                </div>
              ) : (
                <div className="space-y-2">
                  {data?.emails.map((email: any) => (
                    <Card key={email.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            {getTypeBadge(email.type)}
                            {email.processed ? (
                              <Badge variant="outline" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Verwerkt
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <Clock className="h-3 w-3" />
                                In behandeling
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {email.classifiedBy}
                            </span>
                          </div>

                          <h3 className="font-semibold">{email.subject}</h3>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Van: {email.from}</span>
                            <span>Aan: {email.to}</span>
                            <span>{formatDate(email.receivedAt)}</span>
                            {email.attachments.length > 0 && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {email.attachments.length} bijlage(n)
                              </span>
                            )}
                          </div>

                          {email.error && (
                            <div className="flex items-center gap-1 text-sm text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              {email.error}
                            </div>
                          )}

                          {email.invoice && (
                            <div className="mt-2 flex items-center gap-2 text-sm">
                              <Badge variant="outline">
                                Factuur: €{email.invoice.total.toFixed(2)}
                              </Badge>
                              <Badge variant="outline">{email.invoice.status}</Badge>
                              <a
                                href={`/admin/invoices?search=${email.invoice.id}`}
                                className="text-primary hover:underline"
                              >
                                <ExternalLink className="inline h-3 w-3" /> Bekijk factuur
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {email.type === 'INVOICE' && !email.processed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => reprocessMutation.mutate({ id: email.id })}
                              disabled={reprocessMutation.isPending}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm('Email verwijderen?')) {
                                deleteMutation.mutate({ id: email.id });
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Same content for other tabs */}
            <TabsContent value="invoices">
              {/* Same as all, but already filtered */}
            </TabsContent>
            <TabsContent value="contracts">
              {/* Same as all, but already filtered */}
            </TabsContent>
            <TabsContent value="other">
              {/* Same as all, but already filtered */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Email Configuratie</CardTitle>
          <CardDescription>Hoe emails ontvangen en verwerken</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. SendGrid Inbound Parse instellen</h3>
            <p className="text-sm text-muted-foreground">
              Configureer de volgende webhook URL in SendGrid:
            </p>
            <code className="block bg-muted p-2 rounded mt-2 text-sm">
              https://simplicate-automations.vercel.app/api/email/inbound
            </code>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Email adressen</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>
                <code>invoices@yourdomain.com</code> - Voor facturen
              </li>
              <li>
                <code>contracts@yourdomain.com</code> - Voor contracten
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Automatische verwerking</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Facturen worden automatisch uitgelezen met AI OCR</li>
              <li>Draft facturen worden aangemaakt voor goedkeuring</li>
              <li>Projecten worden automatisch gekoppeld indien vermeld</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
