/**
 * Inbound Email tRPC Router
 *
 * Manages inbound emails and their processing
 */

import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { extractInvoiceData } from '@/lib/email/invoice-ocr';

export const inboundEmailRouter = createTRPCRouter({
  /**
   * List all inbound emails with optional filtering
   */
  list: publicProcedure
    .input(
      z.object({
        type: z.enum(['INVOICE', 'CONTRACT', 'OTHER']).optional(),
        processed: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.type && { type: input.type }),
        ...(input.processed !== undefined && { processed: input.processed }),
      };

      const [emails, total] = await Promise.all([
        ctx.db.inboundEmail.findMany({
          where,
          include: {
            attachments: {
              select: {
                id: true,
                filename: true,
                contentType: true,
                size: true,
                // Don't include data in list view
              },
            },
            invoice: {
              select: {
                id: true,
                status: true,
                total: true,
              },
            },
          },
          orderBy: { receivedAt: 'desc' },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.inboundEmail.count({ where }),
      ]);

      return {
        emails,
        total,
        hasMore: total > input.offset + input.limit,
      };
    }),

  /**
   * Get single email with full details
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const email = await ctx.db.inboundEmail.findUnique({
        where: { id: input.id },
        include: {
          attachments: true,
          invoice: {
            include: {
              project: true,
              user: true,
            },
          },
        },
      });

      if (!email) {
        throw new Error('Email not found');
      }

      return email;
    }),

  /**
   * Get email stats
   */
  getStats: publicProcedure.query(async ({ ctx }) => {
    const [total, unprocessed, byType] = await Promise.all([
      ctx.db.inboundEmail.count(),
      ctx.db.inboundEmail.count({ where: { processed: false } }),
      ctx.db.inboundEmail.groupBy({
        by: ['type'],
        _count: true,
      }),
    ]);

    return {
      total,
      unprocessed,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count,
      })),
    };
  }),

  /**
   * Manually reprocess an email
   */
  reprocess: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const email = await ctx.db.inboundEmail.findUnique({
        where: { id: input.id },
        include: {
          attachments: true,
          invoice: true,
        },
      });

      if (!email) {
        throw new Error('Email not found');
      }

      // If it's an invoice, re-run OCR
      if (email.type === 'INVOICE') {
        const invoiceAttachment = email.attachments.find((att) =>
          [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
          ].includes(att.contentType.toLowerCase()),
        );

        if (!invoiceAttachment) {
          throw new Error('No invoice attachment found');
        }

        const ocrResult = await extractInvoiceData(
          Buffer.from(invoiceAttachment.data),
          invoiceAttachment.contentType,
          invoiceAttachment.filename,
        );

        if (!ocrResult.success) {
          throw new Error(`OCR failed: ${ocrResult.error}`);
        }

        // Update existing invoice or create new one
        if (email.invoice) {
          await ctx.db.purchasingInvoice.update({
            where: { sourceEmailId: email.id },
            data: {
              ocrData: ocrResult.data as any,
              ocrConfidence: ocrResult.confidence,
              subtotal: ocrResult.data?.subtotal || 0,
              vatRate: ocrResult.data?.vatRate || null,
              vatAmount: ocrResult.data?.vatAmount || null,
              total: ocrResult.data?.total || 0,
            },
          });
        }

        return {
          success: true,
          ocrResult,
        };
      }

      return {
        success: true,
        message: 'Email reprocessed',
      };
    }),

  /**
   * Delete an email and its attachments
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.inboundEmail.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Mark email as processed
   */
  markProcessed: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.inboundEmail.update({
        where: { id: input.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });

      return { success: true };
    }),

  /**
   * Update email classification
   */
  updateType: publicProcedure
    .input(
      z.object({
        id: z.string(),
        type: z.enum(['INVOICE', 'CONTRACT', 'OTHER']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.inboundEmail.update({
        where: { id: input.id },
        data: {
          type: input.type,
          classifiedBy: 'MANUAL',
        },
      });

      return { success: true };
    }),
});
