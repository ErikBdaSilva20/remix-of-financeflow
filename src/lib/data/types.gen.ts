// PROTECTED — gerado pelo schema (supabase/migrations/0001_business_schema.sql).
// Regenere com: pnpm run types:gen
// NÃO edite manualmente.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      // ── Business Tables (owner_id obrigatório) ─────────────────────────────
      customers: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          job_type: string | null;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'owner_id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };

      invoices: {
        Row: {
          id: string;
          owner_id: string;
          customer_id: string | null;
          issue_date: string;
          due_date: string | null;
          amount_total: number;
          open_amount: number;
          original_amount: number | null;
          original_currency: string;
          status: string;
          channel: string | null;
          product_id: string | null;
          scheduled_payment_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'owner_id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
      };

      // Receitas e despesas unificadas — `type` distingue 'income' de 'expense'.
      // `amount` é sempre positivo; o sinal vem de `type`.
      transactions: {
        Row: {
          id: string;
          owner_id: string;
          type: string; // 'income' | 'expense'
          date: string;
          amount: number;
          original_amount: number | null;
          original_currency: string;
          status: string | null; // income: Received|Pending|Failed|Refunded
          invoice_id: string | null; // income vinculada a uma fatura
          customer_id: string | null; // expense vinculada a um cliente (reembolsável)
          category: string | null; // expense: cogs|marketing|payroll|...
          vendor: string | null; // expense
          description: string | null;
          project_id: string | null;
          department: string | null;
          product: string | null;
          region: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'owner_id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
      };

      vendor_bills: {
        Row: {
          id: string;
          owner_id: string;
          vendor_id: string | null;
          vendor_name: string;
          issue_date: string;
          due_date: string;
          amount_total: number;
          open_amount: number;
          original_amount: number | null;
          original_currency: string;
          status: string;
          category: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vendor_bills']['Row'], 'id' | 'owner_id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['vendor_bills']['Insert']>;
      };

      vendors: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          category: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vendors']['Row'], 'id' | 'owner_id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['vendors']['Insert']>;
      };

      filter_segments: {
        Row: {
          id: string;
          owner_id: string;
          segment_type: string;
          segment_value: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['filter_segments']['Row'], 'id' | 'owner_id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['filter_segments']['Insert']>;
      };

      accounting_settings: {
        Row: {
          id: string;
          owner_id: string;
          basis: 'accrual' | 'cash';
          base_currency: string;
          timezone: string;
          allow_future_dates: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['accounting_settings']['Row'], 'id' | 'owner_id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['accounting_settings']['Insert']>;
      };

      scheduled_reports: {
        Row: {
          id: string;
          owner_id: string;
          report_type: string;
          report_name: string;
          frequency: string;
          next_run_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['scheduled_reports']['Row'], 'id' | 'owner_id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['scheduled_reports']['Insert']>;
      };

      budgets: {
        Row: {
          id: string;
          owner_id: string;
          category: string;
          period_month: string;
          amount: number;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['budgets']['Row'], 'id' | 'owner_id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['budgets']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
