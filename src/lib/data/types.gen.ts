// PROTECTED — gerado pelo schema (supabase/migrations/0001_business_schema.sql).
// Regenere com: pnpm run types:gen
// NÃO edite manualmente.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      // ── Lookup (read-only para rep, sem owner_id) ──────────────────────────
      fx_rates: {
        Row: {
          id: string;
          currency: string;
          date: string;
          rate_to_base: number;
          is_imputed: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['fx_rates']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['fx_rates']['Insert']>;
      };

      // ── Business Tables (owner_id obrigatório) ─────────────────────────────
      accounts: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          type: string;
          currency: string;
          balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['accounts']['Row'], 'id' | 'owner_id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['accounts']['Insert']>;
      };

      bank_transactions: {
        Row: {
          id: string;
          owner_id: string;
          account_id: string | null;
          date: string;
          amount: number;
          original_amount: number | null;
          original_currency: string;
          type: string;
          counterparty: string | null;
          category: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bank_transactions']['Row'], 'id' | 'owner_id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['bank_transactions']['Insert']>;
      };

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

      contacts: {
        Row: {
          id: string;
          owner_id: string;
          customer_id: string | null;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          notes: string | null;
          avatar_color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['contacts']['Row'], 'id' | 'owner_id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>;
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

      payments: {
        Row: {
          id: string;
          owner_id: string;
          invoice_id: string | null;
          date: string;
          amount: number;
          original_amount: number | null;
          original_currency: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'owner_id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
      };

      expenses_new: {
        Row: {
          id: string;
          owner_id: string;
          date: string;
          amount: number;
          original_amount: number | null;
          original_currency: string;
          category: string;
          vendor: string | null;
          description: string | null;
          project_id: string | null;
          department: string | null;
          product: string | null;
          region: string | null;
          customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['expenses_new']['Row'], 'id' | 'owner_id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['expenses_new']['Insert']>;
      };

      vendor_bills: {
        Row: {
          id: string;
          owner_id: string;
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
