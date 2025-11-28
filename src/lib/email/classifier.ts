/**
 * Email Classification Logic
 *
 * Determines whether an incoming email contains an invoice, contract, or other content.
 * Uses a hybrid approach:
 * 1. Check recipient email address
 * 2. Check subject line keywords
 * 3. Check attachment filenames
 * 4. Fallback to AI classification if unclear
 */

import { classifyEmailWithAI } from './invoice-ocr';
import type { EmailType } from '@prisma/client';

export interface EmailClassificationResult {
  type: EmailType;
  classifiedBy: 'ADDRESS' | 'SUBJECT' | 'FILENAME' | 'AI' | 'MANUAL';
  confidence: number; // 0-1
}

/**
 * Keywords for invoice detection (Dutch + English)
 */
const INVOICE_KEYWORDS = [
  'factuur',
  'invoice',
  'rekening',
  'betaling',
  'payment',
  'nota',
  'bill',
  'factura',
];

/**
 * Keywords for contract detection (Dutch + English)
 */
const CONTRACT_KEYWORDS = [
  'contract',
  'overeenkomst',
  'agreement',
  'terms',
  'voorwaarden',
  'conditions',
];

/**
 * Classify an email based on recipient address
 */
function classifyByAddress(toAddress: string): EmailClassificationResult | null {
  const emailLower = toAddress.toLowerCase();

  if (emailLower.includes('invoices@') || emailLower.includes('facturen@')) {
    return {
      type: 'INVOICE',
      classifiedBy: 'ADDRESS',
      confidence: 1.0,
    };
  }

  if (emailLower.includes('contracts@') || emailLower.includes('contracten@')) {
    return {
      type: 'CONTRACT',
      classifiedBy: 'ADDRESS',
      confidence: 1.0,
    };
  }

  return null;
}

/**
 * Classify based on subject line
 */
function classifyBySubject(subject: string): EmailClassificationResult | null {
  const subjectLower = subject.toLowerCase();

  // Check for explicit markers like [INVOICE] or [CONTRACT]
  if (subjectLower.includes('[invoice]') || subjectLower.includes('[factuur]')) {
    return {
      type: 'INVOICE',
      classifiedBy: 'SUBJECT',
      confidence: 0.95,
    };
  }

  if (subjectLower.includes('[contract]')) {
    return {
      type: 'CONTRACT',
      classifiedBy: 'SUBJECT',
      confidence: 0.95,
    };
  }

  // Check for keywords
  const hasInvoiceKeyword = INVOICE_KEYWORDS.some((kw) =>
    subjectLower.includes(kw),
  );
  const hasContractKeyword = CONTRACT_KEYWORDS.some((kw) =>
    subjectLower.includes(kw),
  );

  if (hasInvoiceKeyword && !hasContractKeyword) {
    return {
      type: 'INVOICE',
      classifiedBy: 'SUBJECT',
      confidence: 0.8,
    };
  }

  if (hasContractKeyword && !hasInvoiceKeyword) {
    return {
      type: 'CONTRACT',
      classifiedBy: 'SUBJECT',
      confidence: 0.8,
    };
  }

  return null;
}

/**
 * Classify based on attachment filenames
 */
function classifyByFilenames(
  filenames: string[],
): EmailClassificationResult | null {
  if (filenames.length === 0) return null;

  const filenamesLower = filenames.map((f) => f.toLowerCase());

  // Check if majority of filenames suggest a type
  let invoiceCount = 0;
  let contractCount = 0;

  for (const filename of filenamesLower) {
    if (INVOICE_KEYWORDS.some((kw) => filename.includes(kw))) {
      invoiceCount++;
    }
    if (CONTRACT_KEYWORDS.some((kw) => filename.includes(kw))) {
      contractCount++;
    }
  }

  if (invoiceCount > contractCount && invoiceCount > 0) {
    return {
      type: 'INVOICE',
      classifiedBy: 'FILENAME',
      confidence: 0.75,
    };
  }

  if (contractCount > invoiceCount && contractCount > 0) {
    return {
      type: 'CONTRACT',
      classifiedBy: 'FILENAME',
      confidence: 0.75,
    };
  }

  return null;
}

/**
 * Main classification function
 *
 * Tries multiple methods in order of reliability and speed.
 * Falls back to AI classification if all else fails.
 */
export async function classifyEmail(
  toAddress: string,
  subject: string,
  body: string,
  attachmentFilenames: string[],
): Promise<EmailClassificationResult> {
  // 1. Try email address (fastest, most reliable)
  const addressResult = classifyByAddress(toAddress);
  if (addressResult) {
    return addressResult;
  }

  // 2. Try subject line
  const subjectResult = classifyBySubject(subject);
  if (subjectResult && subjectResult.confidence >= 0.8) {
    return subjectResult;
  }

  // 3. Try filenames
  const filenameResult = classifyByFilenames(attachmentFilenames);
  if (filenameResult) {
    return filenameResult;
  }

  // 4. If we have a low-confidence subject result, use it
  if (subjectResult) {
    return subjectResult;
  }

  // 5. Fallback to AI classification
  try {
    const aiType = await classifyEmailWithAI(subject, body, attachmentFilenames);
    return {
      type: aiType,
      classifiedBy: 'AI',
      confidence: 0.7,
    };
  } catch (error) {
    console.error('AI classification failed:', error);
    // Default to OTHER if all classification methods fail
    return {
      type: 'OTHER',
      classifiedBy: 'AI',
      confidence: 0.5,
    };
  }
}

/**
 * Extract project ID from email subject or body
 * Looks for patterns like:
 * - "Project: ABC123"
 * - "#ABC123"
 * - "P-ABC123"
 */
export function extractProjectReference(
  subject: string,
  body: string,
): string | null {
  const combined = `${subject} ${body}`;

  // Pattern 1: "Project: ABC123" or "Proj: ABC123"
  const projectMatch = combined.match(/project:\s*([A-Z0-9-]+)/i);
  if (projectMatch && projectMatch[1]) return projectMatch[1];

  // Pattern 2: "#ABC123"
  const hashMatch = combined.match(/#([A-Z0-9-]{3,})/);
  if (hashMatch && hashMatch[1]) return hashMatch[1];

  // Pattern 3: "P-ABC123" or "PRJ-ABC123"
  const codeMatch = combined.match(/\b(P|PRJ)-([A-Z0-9-]+)/i);
  if (codeMatch && codeMatch[1] && codeMatch[2]) return `${codeMatch[1]}-${codeMatch[2]}`;

  return null;
}
