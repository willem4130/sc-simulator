'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileUp,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  Eye,
  Download,
  Loader2,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react'
import { api } from '@/trpc/react'
import Link from 'next/link'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

type DocumentStatus = 'PENDING' | 'UPLOADED' | 'VERIFIED' | 'REJECTED'

const statusConfig: Record<
  DocumentStatus,
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  PENDING: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Wachtend',
  },
  UPLOADED: {
    icon: Upload,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Geupload',
  },
  VERIFIED: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Geverifieerd',
  },
  REJECTED: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Afgewezen',
  },
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const config = statusConfig[status]
  const Icon = config.icon
  return (
    <Badge variant="outline" className={`${config.bgColor} ${config.color} border-0`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}

export default function DocumentRequestsPage() {
  const utils = api.useUtils()
  const { data: documents, isLoading } = api.projectEmails.getAllDocumentRequests.useQuery({})
  const { data: stats } = api.projectEmails.getAllDocumentRequestStats.useQuery()

  const updateStatus = api.projectEmails.updateDocumentStatus.useMutation({
    onSuccess: () => {
      utils.projectEmails.getAllDocumentRequests.invalidate()
      utils.projectEmails.getAllDocumentRequestStats.invalidate()
    },
  })

  const filterDocumentsByStatus = (status?: DocumentStatus) => {
    if (!documents) return []
    if (!status) return documents
    return documents.filter((d) => d.status === status)
  }

  const handleVerify = (id: string) => {
    updateStatus.mutate({ id, status: 'VERIFIED' })
  }

  const handleReject = (id: string) => {
    updateStatus.mutate({ id, status: 'REJECTED' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Document Verzoeken</h1>
        <p className="text-muted-foreground">
          Beheer document upload verzoeken en hun status
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totaal</CardTitle>
            <FileUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total ?? '-'}</div>
            <p className="text-xs text-muted-foreground">Alle verzoeken</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wachtend</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending ?? '-'}</div>
            <p className="text-xs text-muted-foreground">Nog niet geupload</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Geupload</CardTitle>
            <Upload className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uploaded ?? '-'}</div>
            <p className="text-xs text-muted-foreground">Te beoordelen</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Geverifieerd</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.verified ?? '-'}</div>
            <p className="text-xs text-muted-foreground">Goedgekeurd</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            <CardTitle>Verzoeken</CardTitle>
          </div>
          <CardDescription>Alle document upload verzoeken</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !documents || documents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Geen verzoeken gevonden</p>
              <p className="text-sm">
                Er zijn nog geen document upload verzoeken aangemaakt.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">Alle ({documents.length})</TabsTrigger>
                <TabsTrigger value="pending">
                  Wachtend ({filterDocumentsByStatus('PENDING').length})
                </TabsTrigger>
                <TabsTrigger value="uploaded">
                  Geupload ({filterDocumentsByStatus('UPLOADED').length})
                </TabsTrigger>
                <TabsTrigger value="verified">
                  Geverifieerd ({filterDocumentsByStatus('VERIFIED').length})
                </TabsTrigger>
              </TabsList>

              {['all', 'pending', 'uploaded', 'verified'].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Gebruiker</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[80px]">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterDocumentsByStatus(
                        tab === 'all' ? undefined : (tab.toUpperCase() as DocumentStatus)
                      ).map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(doc.requestedAt), 'd MMM yyyy', {
                              locale: nl,
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{doc.user.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {doc.user.email}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {doc.project ? (
                              <Link
                                href={`/admin/projects/${doc.project.id}`}
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {doc.project.projectNumber || doc.project.name}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{doc.type}</Badge>
                          </TableCell>
                          <TableCell>
                            {doc.documentUrl ? (
                              <a
                                href={doc.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <Download className="h-3 w-3" />
                                {doc.documentName || 'Download'}
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                Niet geupload
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={doc.status} />
                          </TableCell>
                          <TableCell>
                            {doc.status === 'UPLOADED' ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {doc.documentUrl && (
                                    <DropdownMenuItem asChild>
                                      <a
                                        href={doc.documentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Bekijken
                                      </a>
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => handleVerify(doc.id)}
                                    className="text-green-600"
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Goedkeuren
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleReject(doc.id)}
                                    className="text-red-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Afwijzen
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : doc.documentUrl ? (
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={doc.documentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Eye className="h-4 w-4" />
                                </a>
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
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
