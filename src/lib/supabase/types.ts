/**
 * TypeScript type definitions for FlowVault Supabase database schema
 * Auto-generated types should be created using: npx supabase gen types typescript
 * This file provides manual type definitions for development
 */

export interface Database {
  public: {
    Tables: {
      flowvault_user_settings: {
        Row: {
          id: string;
          clerk_user_id: string;
          n8n_instance_url: string;
          n8n_api_key_encrypted: string;
          encryption_iv: string;
          backup_enabled: boolean;
          backup_schedule: string;
          last_backup_at: string | null;
          retention_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          n8n_instance_url: string;
          n8n_api_key_encrypted: string;
          encryption_iv: string;
          backup_enabled?: boolean;
          backup_schedule?: string;
          last_backup_at?: string | null;
          retention_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          n8n_instance_url?: string;
          n8n_api_key_encrypted?: string;
          encryption_iv?: string;
          backup_enabled?: boolean;
          backup_schedule?: string;
          last_backup_at?: string | null;
          retention_days?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      flowvault_workflow_backups: {
        Row: {
          id: string;
          clerk_user_id: string;
          workflow_id: string;
          workflow_name: string;
          workflow_data: Record<string, unknown>; // JSONB
          content_hash: string;
          version: number;
          tags: string[];
          is_active: boolean;
          backup_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          workflow_id: string;
          workflow_name: string;
          workflow_data: Record<string, unknown>;
          content_hash: string;
          version: number;
          tags?: string[];
          is_active?: boolean;
          backup_type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          workflow_id?: string;
          workflow_name?: string;
          workflow_data?: Record<string, unknown>;
          content_hash?: string;
          version?: number;
          tags?: string[];
          is_active?: boolean;
          backup_type?: string;
          created_at?: string;
        };
      };
      flowvault_archived_workflows: {
        Row: {
          id: string;
          clerk_user_id: string;
          workflow_id: string;
          workflow_name: string;
          workflow_data: Record<string, unknown>;
          tags: string[];
          archived_at: string;
          archived_from_n8n: boolean;
          last_backup_id: string | null;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          workflow_id: string;
          workflow_name: string;
          workflow_data: Record<string, unknown>;
          tags?: string[];
          archived_at?: string;
          archived_from_n8n?: boolean;
          last_backup_id?: string | null;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          workflow_id?: string;
          workflow_name?: string;
          workflow_data?: Record<string, unknown>;
          tags?: string[];
          archived_at?: string;
          archived_from_n8n?: boolean;
          last_backup_id?: string | null;
        };
      };
      flowvault_trash: {
        Row: {
          id: string;
          clerk_user_id: string;
          workflow_id: string;
          workflow_name: string;
          workflow_data: Record<string, unknown>;
          tags: string[];
          deleted_at: string;
          permanent_delete_at: string;
          source: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          workflow_id: string;
          workflow_name: string;
          workflow_data: Record<string, unknown>;
          tags?: string[];
          deleted_at?: string;
          permanent_delete_at?: string;
          source?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          workflow_id?: string;
          workflow_name?: string;
          workflow_data?: Record<string, unknown>;
          tags?: string[];
          deleted_at?: string;
          permanent_delete_at?: string;
          source?: string;
        };
      };
      flowvault_agent_audit_log: {
        Row: {
          id: string;
          clerk_user_id: string | null;
          agent_name: string;
          action: string;
          status: string;
          metadata: Record<string, unknown> | null;
          dry_run: boolean;
          approval_required: boolean;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id?: string | null;
          agent_name: string;
          action: string;
          status: string;
          metadata?: Record<string, unknown> | null;
          dry_run?: boolean;
          approval_required?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string | null;
          agent_name?: string;
          action?: string;
          status?: string;
          metadata?: Record<string, unknown> | null;
          dry_run?: boolean;
          approval_required?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
        };
      };
      flowvault_workflow_tags: {
        Row: {
          id: string;
          clerk_user_id: string;
          tag_name: string;
          color: string | null;
          usage_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          tag_name: string;
          color?: string | null;
          usage_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          tag_name?: string;
          color?: string | null;
          usage_count?: number;
          created_at?: string;
        };
      };
      flowvault_rate_limit_counters: {
        Row: {
          id: string;
          clerk_user_id: string;
          action_type: string;
          counter: number;
          window_start: string;
          window_end: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          action_type: string;
          counter?: number;
          window_start: string;
          window_end: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          action_type?: string;
          counter?: number;
          window_start?: string;
          window_end?: string;
        };
      };
    };
    Functions: {
      flowvault_get_next_backup_version: {
        Args: {
          p_clerk_user_id: string;
          p_workflow_id: string;
        };
        Returns: number;
      };
      flowvault_cleanup_expired_trash: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
  };
}
