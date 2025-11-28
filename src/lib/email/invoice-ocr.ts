/**
 * Invoice OCR using Claude Vision API
 *
 * Extracts structured data from invoice PDFs and images using
 * Claude's vision capabilities.
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface InvoiceOCRResult {
  success: boolean;
  confidence: number; // 0-1
  data?: {
    // Invoice metadata
    invoiceNumber?: string;
    invoiceDate?: string; // ISO date string
    dueDate?: string;

    // Supplier info
    supplierName?: string;
    supplierAddress?: string;
    supplierVAT?: string;
    supplierEmail?: string;

    // Customer info (should be us)
    customerName?: string;
    customerAddress?: string;

    // Financial details
    subtotal?: number;
    vatRate?: number; // as decimal (0.21 for 21%)
    vatAmount?: number;
    total?: number;
    currency?: string;

    // Line items
    lineItems?: Array<{
      description: string;
      quantity?: number;
      unitPrice?: number;
      total: number;
    }>;

    // Additional fields
    paymentTerms?: string;
    bankAccount?: string;
    reference?: string;
  };
  raw?: string; // Raw Claude response
  error?: string;
}

/**
 * Extract invoice data from a PDF or image
 */
export async function extractInvoiceData(
  fileBuffer: Buffer,
  mimeType: string,
  filename?: string,
): Promise<InvoiceOCRResult> {
  try {
    // Convert buffer to base64
    const base64Data = fileBuffer.toString('base64');

    // Validate mime type
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    if (!validTypes.includes(mimeType)) {
      return {
        success: false,
        confidence: 0,
        error: `Unsupported file type: ${mimeType}`,
      };
    }

    // Call Claude Vision API
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: (mimeType === 'application/pdf' ? 'image/png' : mimeType) as
                  | 'image/jpeg'
                  | 'image/png'
                  | 'image/webp',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `Extract all information from this invoice and return it as JSON.

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no explanation.

Expected format:
{
  "invoiceNumber": "INV-2024-001",
  "invoiceDate": "2024-01-15",
  "dueDate": "2024-02-15",
  "supplierName": "Company Name",
  "supplierAddress": "Street, City, Country",
  "supplierVAT": "NL123456789B01",
  "supplierEmail": "invoice@company.com",
  "customerName": "Customer Name",
  "customerAddress": "Address",
  "subtotal": 1000.00,
  "vatRate": 0.21,
  "vatAmount": 210.00,
  "total": 1210.00,
  "currency": "EUR",
  "lineItems": [
    {
      "description": "Service or product description",
      "quantity": 1,
      "unitPrice": 1000.00,
      "total": 1000.00
    }
  ],
  "paymentTerms": "30 days",
  "bankAccount": "NL00BANK0123456789",
  "reference": "PO-123 or other reference"
}

If a field is not present on the invoice, omit it from the JSON.
Extract all amounts as numbers without currency symbols.
For dates, use YYYY-MM-DD format.`,
            },
          ],
        },
      ],
    });

    // Extract text from response
    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return {
        success: false,
        confidence: 0,
        error: 'No text response from Claude',
      };
    }

    const rawText = textBlock.text.trim();

    // Remove markdown code blocks if present
    let jsonText = rawText;
    if (rawText.startsWith('```json')) {
      jsonText = rawText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (rawText.startsWith('```')) {
      jsonText = rawText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Parse JSON
    let invoiceData: InvoiceOCRResult['data'];
    try {
      invoiceData = JSON.parse(jsonText);
    } catch (parseError) {
      return {
        success: false,
        confidence: 0,
        error: `Failed to parse JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        raw: rawText,
      };
    }

    // Calculate confidence based on how many required fields are present
    const requiredFields = [
      'invoiceNumber',
      'invoiceDate',
      'supplierName',
      'total',
    ];
    const presentFields = requiredFields.filter(
      (field) => invoiceData && field in invoiceData && invoiceData[field as keyof typeof invoiceData],
    );
    const confidence = presentFields.length / requiredFields.length;

    return {
      success: true,
      confidence,
      data: invoiceData,
      raw: rawText,
    };
  } catch (error) {
    console.error('Invoice OCR error:', error);
    return {
      success: false,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Classify an email as INVOICE, CONTRACT, or OTHER
 * Uses Claude Haiku for fast, cheap classification
 */
export async function classifyEmailWithAI(
  subject: string,
  body: string,
  attachmentFilenames: string[],
): Promise<'INVOICE' | 'CONTRACT' | 'OTHER'> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Fast & cheap
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: `Classify this email as one of: INVOICE, CONTRACT, OTHER

Subject: ${subject}
Body: ${body?.substring(0, 500) || '(empty)'}
Attachments: ${attachmentFilenames.join(', ') || 'none'}

Respond with ONLY one word: INVOICE, CONTRACT, or OTHER`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return 'OTHER';
    }

    const classification = textBlock.text.trim().toUpperCase();

    if (classification.includes('INVOICE')) return 'INVOICE';
    if (classification.includes('CONTRACT')) return 'CONTRACT';
    return 'OTHER';
  } catch (error) {
    console.error('Email classification error:', error);
    return 'OTHER';
  }
}
