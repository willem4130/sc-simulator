import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { sendTemplatedEmail, sendBulkTemplatedEmail } from '@/lib/email/service'
import crypto from 'crypto'
import { put } from '@vercel/blob'

export const projectEmailsRouter = createTRPCRouter({
  // Get project members for email sending
  getProjectMembers: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get project members with their user info
      const members = await ctx.db.projectMember.findMany({
        where: { projectId: input.projectId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      return members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      }))
    }),

  // Send email to selected project members
  sendToMembers: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        templateId: z.string(),
        userIds: z.array(z.string()),
        createDocumentRequests: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get project details
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        select: {
          id: true,
          name: true,
          projectNumber: true,
          clientName: true,
          simplicateId: true,
        },
      })

      if (!project) {
        throw new Error('Project not found')
      }

      // Get users to send to
      const users = await ctx.db.user.findMany({
        where: { id: { in: input.userIds } },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })

      if (users.length === 0) {
        throw new Error('No valid recipients found')
      }

      const appUrl =
        process.env.NEXTAUTH_URL || 'https://simplicate-automations.vercel.app'

      // Create document requests if needed and generate upload URLs
      const recipientsWithUrls = await Promise.all(
        users.map(async (user) => {
          let uploadUrl: string | undefined

          if (input.createDocumentRequests) {
            // Generate secure upload token
            const uploadToken = crypto.randomBytes(32).toString('hex')

            // Create document request
            await ctx.db.documentRequest.create({
              data: {
                projectId: input.projectId,
                userId: user.id,
                type: 'contract',
                description: `Contract upload for ${project.name}`,
                uploadToken,
                tokenExpiresAt: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ), // 30 days
                status: 'PENDING',
              },
            })

            uploadUrl = `${appUrl}/upload/${uploadToken}`
          }

          return {
            userId: user.id,
            email: user.email,
            name: user.name,
            customVariables: uploadUrl ? { uploadUrl } : undefined,
          }
        })
      )

      // Send emails
      const results = await sendBulkTemplatedEmail(
        input.templateId,
        recipientsWithUrls,
        project
      )

      return {
        ...results,
        projectName: project.name,
      }
    }),

  // Get sent emails for a project
  getSentEmails: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        limit: z.number().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.sentEmail.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        include: {
          template: {
            select: {
              name: true,
              type: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })
    }),

  // Get ALL sent emails (for sent emails overview page)
  getAllSentEmails: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).optional().default(100),
        status: z.enum(['PENDING', 'SENT', 'FAILED']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.sentEmail.findMany({
        where: input.status ? { status: input.status } : undefined,
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        include: {
          template: {
            select: {
              name: true,
              type: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              projectNumber: true,
            },
          },
        },
      })
    }),

  // Get stats for ALL sent emails
  getAllSentEmailStats: publicProcedure.query(async ({ ctx }) => {
    const [total, sent, failed, pending] = await Promise.all([
      ctx.db.sentEmail.count(),
      ctx.db.sentEmail.count({ where: { status: 'SENT' } }),
      ctx.db.sentEmail.count({ where: { status: 'FAILED' } }),
      ctx.db.sentEmail.count({ where: { status: 'PENDING' } }),
    ])

    return { total, sent, failed, pending }
  }),

  // Get email stats for a project
  getEmailStats: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [total, sent, failed, pending] = await Promise.all([
        ctx.db.sentEmail.count({ where: { projectId: input.projectId } }),
        ctx.db.sentEmail.count({
          where: { projectId: input.projectId, status: 'SENT' },
        }),
        ctx.db.sentEmail.count({
          where: { projectId: input.projectId, status: 'FAILED' },
        }),
        ctx.db.sentEmail.count({
          where: { projectId: input.projectId, status: 'PENDING' },
        }),
      ])

      return { total, sent, failed, pending }
    }),

  // Get document requests for a project
  getDocumentRequests: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.documentRequest.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })
    }),

  // Get ALL document requests (for document requests overview page)
  getAllDocumentRequests: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).optional().default(100),
        status: z
          .enum(['PENDING', 'UPLOADED', 'VERIFIED', 'REJECTED'])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.documentRequest.findMany({
        where: input.status ? { status: input.status } : undefined,
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              projectNumber: true,
            },
          },
        },
      })
    }),

  // Get stats for ALL document requests
  getAllDocumentRequestStats: publicProcedure.query(async ({ ctx }) => {
    const [total, pending, uploaded, verified, rejected] = await Promise.all([
      ctx.db.documentRequest.count(),
      ctx.db.documentRequest.count({ where: { status: 'PENDING' } }),
      ctx.db.documentRequest.count({ where: { status: 'UPLOADED' } }),
      ctx.db.documentRequest.count({ where: { status: 'VERIFIED' } }),
      ctx.db.documentRequest.count({ where: { status: 'REJECTED' } }),
    ])

    return { total, pending, uploaded, verified, rejected }
  }),

  // Verify or reject a document
  updateDocumentStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['VERIFIED', 'REJECTED']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.documentRequest.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.status === 'VERIFIED' && { verifiedAt: new Date() }),
        },
      })
    }),

  // Get document request by upload token (for public upload page)
  getDocumentRequestByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const request = await ctx.db.documentRequest.findUnique({
        where: { uploadToken: input.token },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              simplicateId: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })

      if (!request) {
        throw new Error('Invalid or expired upload link')
      }

      // Check if token is expired
      if (request.tokenExpiresAt && request.tokenExpiresAt < new Date()) {
        throw new Error('Upload link has expired')
      }

      return request
    }),

  // Upload document (for public upload page)
  uploadDocument: publicProcedure
    .input(
      z.object({
        token: z.string(),
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        fileContent: z.string(), // Base64 encoded
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find the document request
      const request = await ctx.db.documentRequest.findUnique({
        where: { uploadToken: input.token },
      })

      if (!request) {
        throw new Error('Invalid upload token')
      }

      if (request.status !== 'PENDING') {
        throw new Error('Document already uploaded')
      }

      if (request.tokenExpiresAt && request.tokenExpiresAt < new Date()) {
        throw new Error('Upload link has expired')
      }

      // Convert base64 to buffer
      const fileBuffer = Buffer.from(input.fileContent, 'base64')

      // Upload to Vercel Blob
      let blobUrl: string | null = null
      try {
        const blob = await put(
          `documents/${request.projectId}/${request.userId}/${Date.now()}-${input.fileName}`,
          fileBuffer,
          {
            access: 'public',
            contentType: input.fileType,
          }
        )
        blobUrl = blob.url
      } catch (error) {
        console.error('Blob upload error:', error)
        // If Blob is not configured, continue without it
        // The document request will be marked as uploaded but without a URL
      }

      // Update document request
      const updated = await ctx.db.documentRequest.update({
        where: { id: request.id },
        data: {
          status: 'UPLOADED',
          uploadedAt: new Date(),
          documentUrl: blobUrl,
          documentName: input.fileName,
          documentSize: input.fileSize,
        },
      })

      return { success: true, documentId: updated.id }
    }),
})
