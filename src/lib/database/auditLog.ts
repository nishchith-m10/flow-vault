/**
 * Agent audit log database operations
 */

import type { Database } from '../supabase/types';
import { supabase } from './client';

type AuditLog = Database['public']['Tables']['flowvault_agent_audit_log']['Row'];
type AuditLogInsert = Database['public']['Tables']['flowvault_agent_audit_log']['Insert'];

/**
 * Creates an audit log entry
 */
export async function createAuditLog(log: AuditLogInsert) {
  const { data, error } = await supabase
    .from('flowvault_agent_audit_log')
    .insert(log as never)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create audit log: ${error.message}`);
  }

  return data as AuditLog;
}

/**
 * Gets audit logs for a user
 */
export async function getUserAuditLogs(clerkUserId: string) {
  const { data, error } = await supabase
    .from('flowvault_agent_audit_log')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }

  return data as AuditLog[];
}

/**
 * Gets audit logs for a specific agent
 */
export async function getAgentAuditLogs(agentName: string) {
  const { data, error } = await supabase
    .from('flowvault_agent_audit_log')
    .select('*')
    .eq('agent_name', agentName)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch agent audit logs: ${error.message}`);
  }

  return data as AuditLog[];
}

/**
 * Gets pending approval audit logs
 */
export async function getPendingApprovals(clerkUserId: string) {
  const { data, error } = await supabase
    .from('flowvault_agent_audit_log')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .eq('approval_required', true)
    .is('approved_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch pending approvals: ${error.message}`);
  }

  return data as AuditLog[];
}

/**
 * Approves an audit log entry
 */
export async function approveAuditLog(id: string, approvedBy: string) {
  const { data, error } = await supabase
    .from('flowvault_agent_audit_log')
    .update({
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    } as never)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to approve audit log: ${error.message}`);
  }

  return data as AuditLog;
}
