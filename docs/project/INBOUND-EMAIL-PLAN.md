# Inbound Email System - Implementation Plan

## Overview
Automated processing of inbound emails for purchase invoices and contracts using Claude Vision OCR and smart classification.

## Architecture

### Email Flow
```
Incoming Email (invoices@domain.com / contracts@domain.com)
    ↓
1. Webhook receives email (SendGrid Inbound Parse / Resend)
    ↓
2. Extract attachments (PDF/images)
    ↓
3. Smart Classification:
   - Check email address (invoices@ vs contracts@)
   - Parse subject line keywords
   - Fallback: Claude Haiku classification ($0.001/email)
    ↓
4a. INVOICE Path:
    - Extract data with Claude Vision ($0.003-0.008/invoice)
    - Create PurchasingInvoice (DRAFT status)
    - Match to project (if mentioned)
    - Notify admin for review
    ↓
4b. CONTRACT Path:
    - Store PDF/document
    - Link to project/employee
    - Create notification
```

## Cost Analysis
- Email handling: Free (SendGrid free tier)
- Classification: $0.001/email (only if needed)
- Invoice OCR: $0.003-0.008/invoice
- **Total: ~$0.01 per invoice email**
- **100 invoices/month = $1/month**

## Email Provider Options

### Option 1: SendGrid Inbound Parse (Recommended)
**Pros:**
- Free tier: 100 emails/day
- Simple webhook integration
- Automatic email parsing
- Reliable delivery

**Cons:**
- Requires DNS MX record configuration

### Option 2: Resend Inbound Email
**Pros:**
- Modern API
- Already using Resend for outbound
- Simple setup

**Cons:**
- Currently in beta
- Limited documentation

### Option 3: Cloudflare Email Workers
**Pros:**
- Most flexible
- Can handle any domain
- Free tier available

**Cons:**
- More complex setup
- Requires Cloudflare DNS

**Decision: Start with SendGrid Inbound Parse**

## Database Schema

### New Tables

```prisma
model InboundEmail {
  id            String   @id @default(cuid())
  from          String
  to            String
  subject       String
  body          String?  @db.Text
  receivedAt    DateTime @default(now())

  // Classification
  type          EmailType?  // INVOICE | CONTRACT | OTHER
  classifiedBy  String?     // ADDRESS | SUBJECT | AI

  // Processing
  processed     Boolean  @default(false)
  processedAt   DateTime?
  error         String?  @db.Text

  // Relations
  attachments   EmailAttachment[]
  invoice       PurchasingInvoice?

  createdAt     DateTime @default(now())

  @@index([from])
  @@index([receivedAt])
  @@index([processed])
}

enum EmailType {
  INVOICE
  CONTRACT
  OTHER
}

model EmailAttachment {
  id            String   @id @default(cuid())
  emailId       String
  filename      String
  contentType   String
  size          Int
  data          Bytes    // Store directly in DB (or S3 URL for large files)

  email         InboundEmail @relation(fields: [emailId], references: [id], onDelete: Cascade)

  @@index([emailId])
}
```

### Schema Updates

```prisma
// Extend PurchasingInvoice
model PurchasingInvoice {
  // ... existing fields ...

  // Add OCR source tracking
  sourceEmailId String?
  sourceEmail   InboundEmail? @relation(fields: [sourceEmailId], references: [id])
  ocrData       Json?         // Raw OCR extraction result
  ocrConfidence Float?        // Confidence score (0-1)
  needsReview   Boolean @default(true)  // Flag for manual review
}
```

## Implementation Steps

### Phase 1: Database Schema ✓
- [ ] Add InboundEmail model
- [ ] Add EmailAttachment model
- [ ] Add EmailType enum
- [ ] Extend PurchasingInvoice with OCR fields
- [ ] Run migration

### Phase 2: Email Classification
- [ ] Create `src/lib/email/classifier.ts`
- [ ] Implement address-based routing
- [ ] Implement keyword detection
- [ ] Add Claude Haiku fallback classification

### Phase 3: Invoice OCR
- [ ] Install `@anthropic-ai/sdk`
- [ ] Create `src/lib/email/invoice-ocr.ts`
- [ ] Implement Claude Vision extraction
- [ ] Add confidence scoring
- [ ] Handle multiple invoices per email

### Phase 4: Webhook Endpoint
- [ ] Create `/api/email/inbound` endpoint
- [ ] Parse multipart form data
- [ ] Extract attachments
- [ ] Call classifier
- [ ] Process invoices/contracts
- [ ] Store in database

### Phase 5: Admin UI
- [ ] `/admin/email/inbox` - View all inbound emails
- [ ] Filter by type (INVOICE/CONTRACT/OTHER)
- [ ] Review OCR results
- [ ] Approve/edit invoices
- [ ] Manual reprocessing

### Phase 6: SendGrid Setup
- [ ] Configure MX records
- [ ] Set up inbound parse webhook
- [ ] Test with real emails
- [ ] Monitor error logs

## API Endpoints

### Webhook (Public)
- `POST /api/email/inbound` - Receive emails from SendGrid

### Admin (Protected)
- `GET /api/trpc/inboundEmail.list` - List all emails
- `GET /api/trpc/inboundEmail.getById` - Get email details
- `POST /api/trpc/inboundEmail.reprocess` - Manually reprocess
- `POST /api/trpc/inboundEmail.approve` - Approve OCR result
- `POST /api/trpc/inboundEmail.reject` - Reject and request manual entry

## Environment Variables

```env
# Anthropic (for Claude Vision OCR)
ANTHROPIC_API_KEY=sk-ant-...

# SendGrid (optional - for webhook validation)
SENDGRID_WEBHOOK_SECRET=...
```

## Testing Strategy

1. **Unit Tests**
   - Email classification logic
   - OCR result parsing

2. **Integration Tests**
   - Send test emails to webhook
   - Verify database records
   - Check OCR accuracy

3. **Manual Testing**
   - Real invoice PDFs
   - Different formats
   - Edge cases (multiple invoices, no invoice, etc.)

## Security Considerations

- Webhook signature verification (SendGrid)
- Rate limiting on webhook endpoint
- File size limits (max 10MB per attachment)
- Virus scanning (optional - ClamAV)
- PII handling (invoices may contain sensitive data)

## Monitoring & Alerts

- Track OCR success rate
- Alert on processing failures
- Monitor costs (Claude API usage)
- Weekly digest of unprocessed emails

## Future Enhancements

- [ ] Email reply handling (approve via email)
- [ ] Automatic project matching (ML-based)
- [ ] Receipt OCR (employee expenses)
- [ ] Multi-language support (Dutch invoices)
- [ ] Integration with accounting software
