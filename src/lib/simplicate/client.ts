/**
 * Simplicate API Client
 *
 * Type-safe wrapper for the Simplicate REST API
 * Docs: https://developer.simplicate.com
 */

import { env } from '@/env';

// ==========================================
// Types
// ==========================================

export interface SimplicateConfig {
  apiKey: string;
  apiSecret: string;
  domain: string;
}

export interface SimplicateProject {
  id: string;
  project_number?: string;
  name: string;
  organization?: {
    id: string;
    name: string;
  };
  project_manager?: {
    id: string;
    name: string;
  };
  start_date?: string;
  end_date?: string;
  status?: string;
  description?: string;
}

export interface SimplicateEmployee {
  id: string;
  name: string;
  email?: string;
  work_email?: string;
  person_id?: string;
  person?: {
    id: string;
    full_name?: string;
    email?: string;
  };
  // Financial rate fields
  hourly_sales_tariff?: number;
  hourly_cost_tariff?: number;
  // Employee type (internal/external)
  type?: {
    id?: string;
    label?: string;
  };
}

export interface SimplicateHours {
  id: string;
  project_id: string;
  employee_id: string;
  hours: number;
  date?: string;
  start_date?: string;  // Simplicate uses start_date for hours
  description?: string;
  status?: string;
  hourly_rate?: number;
  billable?: boolean;
  tariff?: number;
  projectservice?: {
    id: string;
    name: string;
    start_date?: string;
  };
  employee?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
  };
}

export interface SimplicateServiceHourType {
  id: string;
  budgeted_amount: number;
  tariff: number;
  billable: boolean;
  hourstype?: {
    id: string;
    label: string;
    type: string;
  };
}

export interface SimplicateService {
  id: string;
  project_id: string;
  name: string;
  status: string;
  start_date?: string;
  end_date?: string;
  amount?: string;
  invoice_method?: string;
  track_hours?: boolean;
  hour_types?: SimplicateServiceHourType[];
}

export interface SimplicateDocument {
  id: string;
  title: string;
  filename: string;
  document_type_id?: string;
  linked_to?: {
    type: string;
    id: string;
  }[];
  url?: string;
}

export interface SimplicateInvoice {
  id: string;
  invoice_number?: string;
  project_id?: string;
  status: string;
  date?: string;
  total_excl_vat?: number;
  total_incl_vat?: number;
}

// ==========================================
// Simplicate API Client
// ==========================================

export class SimplicateClient {
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(config?: Partial<SimplicateConfig>) {
    this.apiKey = config?.apiKey || process.env.SIMPLICATE_API_KEY || '';
    this.apiSecret = config?.apiSecret || process.env.SIMPLICATE_API_SECRET || '';
    const domain = config?.domain || process.env.SIMPLICATE_DOMAIN || 'api.simplicate.com';
    // Remove https:// if present and ensure proper format
    const cleanDomain = domain.replace(/^https?:\/\//, '');
    this.baseUrl = `https://${cleanDomain}/api/v2`;

    if (!this.apiKey || !this.apiSecret) {
      console.warn('Simplicate API credentials not configured');
    }
  }

  private getAuthHeader(): string {
    const credentials = `${this.apiKey}:${this.apiSecret}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authentication-Key': this.apiKey,
        'Authentication-Secret': this.apiSecret,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Simplicate API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    return data.data || data;
  }

  // ==========================================
  // Projects
  // ==========================================

  async getProjects(params?: {
    offset?: number;
    limit?: number;
    q?: string;
  }): Promise<SimplicateProject[]> {
    const queryParams = new URLSearchParams();
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.q) queryParams.set('q', params.q);

    const query = queryParams.toString();
    return this.request<SimplicateProject[]>(
      `/projects/project${query ? `?${query}` : ''}`
    );
  }

  async getProject(id: string): Promise<SimplicateProject> {
    return this.request<SimplicateProject>(`/projects/project/${id}`);
  }

  async getProjectEmployees(projectId: string): Promise<SimplicateEmployee[]> {
    return this.request<SimplicateEmployee[]>(
      `/projects/project/${projectId}/employee`
    );
  }

  // ==========================================
  // Project Services (Diensten)
  // ==========================================

  async getServices(params?: {
    project_id?: string;
    offset?: number;
    limit?: number;
  }): Promise<SimplicateService[]> {
    const queryParams = new URLSearchParams();
    if (params?.project_id) queryParams.set('q[project_id]', params.project_id);
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.request<SimplicateService[]>(
      `/projects/service${query ? `?${query}` : ''}`
    );
  }

  async getService(id: string): Promise<SimplicateService> {
    return this.request<SimplicateService>(`/projects/service/${id}`);
  }

  // ==========================================
  // Employees
  // ==========================================

  async getEmployees(params?: {
    offset?: number;
    limit?: number;
  }): Promise<SimplicateEmployee[]> {
    const queryParams = new URLSearchParams();
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.request<SimplicateEmployee[]>(
      `/hrm/employee${query ? `?${query}` : ''}`
    );
  }

  async getEmployee(id: string): Promise<SimplicateEmployee> {
    return this.request<SimplicateEmployee>(`/hrm/employee/${id}`);
  }

  // ==========================================
  // Hours
  // ==========================================

  async getHours(params?: {
    project_id?: string;
    employee_id?: string;
    start_date?: string;
    end_date?: string;
    offset?: number;
    limit?: number;
  }): Promise<SimplicateHours[]> {
    const queryParams = new URLSearchParams();
    if (params?.project_id) queryParams.set('q[project_id]', params.project_id);
    if (params?.employee_id) queryParams.set('q[employee_id]', params.employee_id);
    if (params?.start_date) queryParams.set('q[start_date][ge]', params.start_date);
    if (params?.end_date) queryParams.set('q[start_date][le]', params.end_date);
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.request<SimplicateHours[]>(
      `/hours/hours${query ? `?${query}` : ''}`
    );
  }

  // Fetch all hours with pagination
  async getAllHours(params?: {
    project_id?: string;
    employee_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<SimplicateHours[]> {
    const allHours: SimplicateHours[] = [];
    const pageSize = 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.getHours({
        ...params,
        offset,
        limit: pageSize,
      });

      allHours.push(...batch);

      if (batch.length < pageSize) {
        hasMore = false;
      } else {
        offset += pageSize;
      }
    }

    return allHours;
  }

  async createHours(data: {
    project_id: string;
    employee_id: string;
    hours: number;
    date: string;
    description?: string;
  }): Promise<SimplicateHours> {
    return this.request<SimplicateHours>('/hours/hours', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // Documents
  // ==========================================

  async getDocuments(params?: {
    linked_to_type?: string;
    linked_to_id?: string;
  }): Promise<SimplicateDocument[]> {
    const queryParams = new URLSearchParams();
    if (params?.linked_to_type) queryParams.set('linked_to.type', params.linked_to_type);
    if (params?.linked_to_id) queryParams.set('linked_to.id', params.linked_to_id);

    const query = queryParams.toString();
    return this.request<SimplicateDocument[]>(
      `/documents/document${query ? `?${query}` : ''}`
    );
  }

  async uploadDocument(data: {
    title: string;
    filename: string;
    content: string; // Base64 encoded
    linked_to?: Array<{
      type: string;
      id: string;
    }>;
  }): Promise<SimplicateDocument> {
    return this.request<SimplicateDocument>('/documents/document', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDocument(id: string): Promise<SimplicateDocument> {
    return this.request<SimplicateDocument>(`/documents/document/${id}`);
  }

  // ==========================================
  // Invoices
  // ==========================================

  async getInvoices(params?: {
    project_id?: string;
    status?: string;
  }): Promise<SimplicateInvoice[]> {
    const queryParams = new URLSearchParams();
    if (params?.project_id) queryParams.set('project_id', params.project_id);
    if (params?.status) queryParams.set('status', params.status);

    const query = queryParams.toString();
    return this.request<SimplicateInvoice[]>(
      `/invoices/invoice${query ? `?${query}` : ''}`
    );
  }

  async createInvoice(data: {
    project_id: string;
    date?: string;
    payment_term_id?: string;
    status?: string;
  }): Promise<SimplicateInvoice> {
    return this.request<SimplicateInvoice>('/invoices/invoice', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInvoice(id: string): Promise<SimplicateInvoice> {
    return this.request<SimplicateInvoice>(`/invoices/invoice/${id}`);
  }

  // ==========================================
  // Hours Approval
  // ==========================================

  async getHoursApproval(params?: {
    offset?: number;
    limit?: number;
  }): Promise<Array<{
    id: string;
    employee_id: string;
    status: string;
    date: string;
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.request(`/hours/approval${query ? `?${query}` : ''}`);
  }

  async getHoursApprovalStatuses(): Promise<Array<{
    id: string;
    label: string;
  }>> {
    return this.request('/hours/approvalstatus');
  }

  async getHoursTypes(): Promise<Array<{
    id: string;
    label: string;
    type: string;
  }>> {
    return this.request('/hours/hourstype');
  }

  // ==========================================
  // Employee Expenses (from hours module)
  // ==========================================

  async getEmployeeExpenses(params?: {
    offset?: number;
    limit?: number;
  }): Promise<Array<{
    id: string;
    employee_id: string;
    project_id?: string;
    amount: number;
    date: string;
    description?: string;
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.request(`/hours/employeeexpenses${query ? `?${query}` : ''}`);
  }

  // ==========================================
  // Costs & Expenses
  // ==========================================

  async getCostTypes(): Promise<Array<{
    id: string;
    label: string;
  }>> {
    return this.request('/costs/coststype');
  }

  async getExpenses(params?: {
    offset?: number;
    limit?: number;
  }): Promise<Array<{
    id: string;
    project_id?: string;
    employee_id?: string;
    amount: number;
    date: string;
    description?: string;
    cost_type_id?: string;
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.request(`/costs/expense${query ? `?${query}` : ''}`);
  }

  // ==========================================
  // Mileage
  // ==========================================

  async getMileage(params?: {
    offset?: number;
    limit?: number;
  }): Promise<Array<{
    id: string;
    employee_id: string;
    project_id?: string;
    kilometers: number;
    date: string;
    description?: string;
    rate?: number;
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.request(`/mileage/mileage${query ? `?${query}` : ''}`);
  }

  // ==========================================
  // CRM - Organizations
  // ==========================================

  async getOrganizations(params?: {
    offset?: number;
    limit?: number;
  }): Promise<Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    visiting_address?: {
      city?: string;
      country?: string;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.request(`/crm/organization${query ? `?${query}` : ''}`);
  }

  async getOrganization(id: string): Promise<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
  }> {
    return this.request(`/crm/organization/${id}`);
  }

  // ==========================================
  // Webhooks
  // ==========================================

  async createWebhook(data: {
    url: string;
    events: string[];
    active: boolean;
  }): Promise<{ id: string; url: string; events: string[] }> {
    return this.request('/webhooks/webhook', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getWebhooks(): Promise<Array<{ id: string; url: string; events: string[] }>> {
    return this.request('/webhooks/webhook');
  }
}

// ==========================================
// Singleton Instance
// ==========================================

let simplicateClient: SimplicateClient | null = null;

export function getSimplicateClient(): SimplicateClient {
  if (!simplicateClient) {
    simplicateClient = new SimplicateClient();
  }
  return simplicateClient;
}
