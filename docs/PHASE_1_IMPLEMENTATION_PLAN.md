# FlowVault Phase 1 Implementation Plan

**Document Version:** 1.0.0  
**Created:** January 6, 2026  
**Author:** GitHub Copilot (Claude Sonnet 4.5)  
**Project:** FlowVault - n8n Workflow Management Platform  
**Phase:** Phase 1 - Foundation & Core Features

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-06 | GitHub Copilot | Initial comprehensive implementation plan |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Context & Background](#project-context--background)
3. [Phase 1 Scope Definition](#phase-1-scope-definition)
4. [System Architecture Overview](#system-architecture-overview)
5. [Feature Specifications](#feature-specifications)
6. [Implementation Strategy](#implementation-strategy)
7. [Technical Architecture Deep Dive](#technical-architecture-deep-dive)
8. [Database Schema & Data Flow](#database-schema--data-flow)
9. [API Design & Integration Patterns](#api-design--integration-patterns)
10. [Security Architecture](#security-architecture)
11. [Error Handling & Resilience](#error-handling--resilience)
12. [Testing Strategy](#testing-strategy)
13. [Deployment Plan](#deployment-plan)
14. [Monitoring & Observability](#monitoring--observability)
15. [Risk Management](#risk-management)
16. [Performance Optimization](#performance-optimization)
17. [User Experience Design](#user-experience-design)
18. [Code Organization & Standards](#code-organization--standards)
19. [Documentation Requirements](#documentation-requirements)
20. [Success Metrics & KPIs](#success-metrics--kpis)
21. [Timeline & Milestones](#timeline--milestones)
22. [Dependencies & Prerequisites](#dependencies--prerequisites)
23. [Appendices](#appendices)

---

## Executive Summary

### Project Vision

FlowVault represents a transformative solution for n8n workflow management, addressing critical gaps in the current n8n platform ecosystem. This implementation plan outlines the comprehensive strategy for delivering Phase 1 features that will establish FlowVault as an indispensable tool for n8n users who require enterprise-grade workflow backup, recovery, and management capabilities.

### Current State Analysis

The n8n platform, while powerful for workflow automation, lacks several critical features that enterprise users require:

**Identified Pain Points:**
- No native automated backup system for workflows
- Export functionality contains a critical bug where multiple workflow exports merge into a single corrupted JSON file
- Environment variables tab in the workflow editor serves no functional purpose and creates user confusion
- No version control or historical tracking of workflow changes
- Absence of workflow archival and soft-delete mechanisms
- Limited disaster recovery capabilities
- No centralized workflow management interface outside the n8n UI

**Impact on Users:**
These limitations force users to implement manual, error-prone backup processes, risk data loss during exports, and lack visibility into workflow evolution over time. Organizations using n8n for mission-critical automation face significant operational risks due to these gaps.

### Phase 1 Objectives

Phase 1 establishes the foundational infrastructure and delivers three critical features:

**Primary Deliverables:**
1. Automated Workflow Backup System with SHA-256 deduplication
2. Export Bug Fix to ensure multi-workflow exports produce valid, separate JSON files
3. ENV Variables Tab Removal to streamline the n8n UI

**Secondary Deliverables:**
- Complete authentication infrastructure using Clerk
- Robust database schema in Supabase with flowvault_* prefixed tables
- Secure credential storage with AES-256-GCM encryption
- Rate limiting and abuse prevention mechanisms
- Comprehensive error handling and logging
- Admin dashboard for workflow management
- API proxy layer for n8n integration

### Strategic Approach

This implementation follows a methodical, risk-mitigated approach:

**Development Philosophy:**
- Security-first architecture with defense in depth
- Incremental feature delivery with continuous validation
- Extensive testing at every layer
- User-centric design prioritizing simplicity
- Infrastructure as code for reproducibility
- Comprehensive documentation for maintainability

**Quality Gates:**
Each feature will pass through multiple quality gates including unit testing, integration testing, security audits, performance benchmarking, and user acceptance testing before deployment.

### Success Criteria

Phase 1 will be considered successful when:

1. Users can configure automated backups with configurable schedules
2. Backup deduplication reduces storage costs by at least sixty percent
3. Export bug is completely resolved with zero reported failures
4. ENV tab removal causes zero disruption to existing users
5. System handles ten thousand workflows per user without performance degradation
6. Backup operations complete within five seconds for average workflows
7. Zero security vulnerabilities in authentication or credential storage
8. Ninety-nine point nine percent uptime for backup operations
9. Complete audit trail for all workflow operations
10. User onboarding completion in under two minutes

### Risk Mitigation Summary

Key risks and mitigation strategies:

**Technical Risks:**
- n8n API rate limiting: Implement exponential backoff and request queuing
- Data loss during migration: Multi-stage validation with rollback capability
- Encryption key compromise: Key rotation mechanism and HSM integration path
- Database schema conflicts: Prefixed table names and isolated schema

**Operational Risks:**
- User credential exposure: Zero-knowledge architecture with client-side encryption option
- Service availability: Multi-region deployment with automatic failover
- Data corruption: Checksums and integrity verification at every layer
- Performance bottlenecks: Horizontal scaling with load balancing

### Resource Requirements

**Development Team:**
- Full-stack engineer: Primary implementer
- Security specialist: Credential handling and encryption review
- QA engineer: Test automation and validation
- DevOps engineer: Infrastructure and deployment

**Infrastructure:**
- Supabase Pro tier for database and storage
- Vercel Pro for Next.js hosting
- Upstash Redis for rate limiting
- Clerk Pro for authentication
- GitHub Actions for CI/CD

**Timeline:**
- Total duration: Six weeks
- Sprint 1: Infrastructure and authentication (Week 1-2)
- Sprint 2: Backup system implementation (Week 2-4)
- Sprint 3: Export fix and ENV removal (Week 4-5)
- Sprint 4: Testing and deployment (Week 5-6)

---

## Project Context & Background

### FlowVault Platform Overview

FlowVault is designed as a comprehensive workflow management platform that extends n8n's capabilities without requiring modifications to the n8n core codebase. It operates as a complementary service that users can opt into, providing enhanced features while maintaining full compatibility with standard n8n instances.

**Architecture Philosophy:**

The platform follows a non-invasive integration pattern where FlowVault acts as an intelligent middleware layer between users and their n8n instances. This design ensures:

- Zero modifications to n8n source code
- No dependencies on n8n version upgrades
- Compatibility with self-hosted and cloud n8n instances
- Ability to work with multiple n8n instances per user
- Graceful degradation if FlowVault services are unavailable

**Target User Segments:**

Primary users include:
- Enterprise automation teams managing fifty-plus workflows
- DevOps teams using n8n for infrastructure automation
- Data engineering teams with complex ETL pipelines
- Small businesses requiring compliance and audit trails
- Freelance consultants managing client workflows

### Technology Stack Rationale

**Frontend Framework - Next.js 15 with App Router:**

Next.js was selected for several compelling reasons:
- Server-side rendering improves initial load performance
- App Router provides superior data fetching patterns
- Built-in API routes eliminate need for separate backend
- Vercel deployment offers exceptional developer experience
- React Server Components reduce client-side JavaScript
- TypeScript integration ensures type safety across the stack

**Authentication - Clerk:**

Clerk provides enterprise-grade authentication with:
- Pre-built UI components reducing development time
- Social login integrations out of the box
- Multi-factor authentication support
- Session management with HTTP-only cookies
- Webhook support for user lifecycle events
- GDPR compliance built-in
- Easy migration path to custom authentication if needed

**Database - Supabase PostgreSQL:**

Supabase offers several advantages:
- PostgreSQL provides ACID guarantees for critical data
- Row Level Security for multi-tenant data isolation
- Real-time subscriptions for live updates
- Automatic API generation
- Built-in storage for file uploads
- Generous free tier for development
- Easy scaling path to enterprise tiers

**Encryption - Native Node.js Crypto:**

Using built-in crypto module ensures:
- No third-party dependencies for core security
- AES-256-GCM provides authenticated encryption
- FIPS 140-2 compliant algorithms
- No licensing concerns
- Audited and battle-tested implementation

**Rate Limiting - Upstash Redis:**

Upstash was chosen for:
- Serverless-first design matches Next.js deployment
- Global replication for low latency
- Per-request pricing model
- REST API for edge runtime compatibility
- Automatic persistence
- Redis compatibility for easy migration

### Previous Implementation Attempts

**Historical Context:**

Prior to this implementation plan, several approaches were explored:

*Attempt 1: Supabase CLI Migration*
- Used direct database connection strings
- Failed due to authentication errors
- Learned: CLI tools have inconsistent auth handling

*Attempt 2: Bash Script with REST API*
- Created shell script for migration
- Failed with tenant not found errors
- Learned: Direct REST API requires careful header management

*Attempt 3: Node.js Migration Script*
- Implemented programmatic migration
- Failed due to RLS policy syntax errors
- Learned: Row Level Security needs custom session configuration

*Attempt 4: MCP Tool with RLS Policies*
- Attempted full schema with RLS
- Failed with column reference errors
- Learned: current_setting() requires runtime configuration

*Attempt 5: MCP Tool with Prefixed Tables*
- Removed RLS policies temporarily
- Successfully created all seven tables
- Learned: Prefixed naming avoids conflicts with existing schemas

**Key Insights from Failed Attempts:**

These iterations revealed several critical architectural decisions:

1. Table name prefixing is essential when database hosts multiple applications
2. RLS policies require application-level enforcement until proper session management is implemented
3. MCP tools provide more reliable migration execution than CLI
4. Foreign key constraints between tables with circular dependencies need careful ordering
5. Helper functions must also be prefixed to avoid naming collisions

### Database Schema Context

**Existing Database State:**

The target Supabase database already contains forty-plus tables from an unrelated marketing automation application including:
- user_settings (conflicting name with original FlowVault schema)
- campaigns, creative_briefs, scripts, videos
- generation_jobs, scenes, platform_posts
- brand_guidelines, competitor_ads, trends

**Schema Isolation Strategy:**

To coexist peacefully with existing tables, all FlowVault tables use the flowvault_ prefix:
- flowvault_user_settings
- flowvault_workflow_backups
- flowvault_archived_workflows
- flowvault_trash
- flowvault_agent_audit_log
- flowvault_workflow_tags
- flowvault_rate_limit_counters

This isolation ensures:
- Zero impact on existing application
- Clear ownership boundaries
- Easy identification of FlowVault tables
- Migration path if database separation is needed later
- Reduced risk of accidental data corruption

### Integration Architecture

**n8n API Integration Pattern:**

FlowVault integrates with n8n through its REST API using a proxy pattern:

```
User Request → FlowVault UI → Next.js API Route → n8n Instance
                                      ↓
                               Supabase Database
                                      ↓
                               Backup Storage
```

This architecture provides:
- Request/response logging for debugging
- Credential injection without exposing to client
- Rate limiting enforcement
- Error transformation and user-friendly messages
- Retry logic for transient failures
- Circuit breaker pattern for n8n downtime

**Data Flow Principles:**

All workflow data follows strict flow patterns:
1. Data always flows through authenticated endpoints
2. Credentials never reach browser client
3. Workflow JSON is validated before storage
4. Deduplication happens before database insertion
5. Audit logs are written atomically with data changes

### Compliance and Security Context

**Data Handling Requirements:**

Users' n8n instances may contain sensitive data:
- API keys and credentials
- Customer information
- Business logic and trade secrets
- Integration configurations
- Proprietary automation workflows

**Security Commitments:**

FlowVault implements security at multiple layers:
- Encryption at rest using AES-256-GCM
- Encryption in transit using TLS 1.3
- Zero-knowledge architecture where possible
- Credential rotation capabilities
- Audit logging for compliance
- Data retention policies
- Right to deletion (GDPR Article 17)
- Data portability (GDPR Article 20)

**Threat Model:**

Potential attack vectors and defenses:
- Credential theft: Encrypted storage, key rotation
- Session hijacking: HTTP-only cookies, CSRF tokens
- SQL injection: Parameterized queries, Supabase client
- XSS attacks: Content Security Policy, sanitization
- DDOS: Rate limiting, CDN protection
- Man-in-the-middle: TLS pinning, HSTS
- Insider threats: Audit logs, access controls

---

## Phase 1 Scope Definition

### In-Scope Features

**Feature 1: Automated Workflow Backup System**

The backup system represents the cornerstone of Phase 1, providing users with peace of mind that their n8n workflows are safely preserved with version history and deduplication.

*Core Capabilities:*
- Scheduled backup execution based on cron expressions
- Manual backup triggering through UI
- SHA-256 content hashing for deduplication
- Incremental version numbering per workflow
- Configurable retention policies
- Backup metadata including timestamps and user actions
- Tag-based organization of backups
- Restore capability to n8n instance
- Backup comparison and diff viewing
- Export backups as individual JSON files

*User Workflows:*

User Story 1: As an automation engineer, I want to schedule daily backups of all my workflows so that I have historical versions available if something breaks.

User Story 2: As a compliance officer, I want to see who backed up what and when, so I can demonstrate audit compliance.

User Story 3: As a developer, I want to restore a previous version of a workflow after a failed update without losing my current work.

User Story 4: As a team lead, I want to tag backups with release numbers so I can track which workflow versions are in production.

*Success Metrics:*
- Backup completion rate: ninety-nine point five percent
- Average backup time: less than five seconds for workflows under 100 nodes
- Deduplication ratio: minimum sixty percent storage savings
- Restore success rate: one hundred percent
- User adoption: fifty percent of users enable automatic backups within first week

**Feature 2: Export Bug Fix**

The current n8n export functionality contains a critical bug where selecting multiple workflows for export results in a single corrupted JSON file instead of separate valid files or a properly formatted multi-workflow export.

*Problem Analysis:*

Current broken behavior:
1. User selects three workflows: WorkflowA, WorkflowB, WorkflowC
2. Clicks export button
3. Browser downloads single file: workflows.json
4. File contains malformed JSON with concatenated workflow objects
5. File cannot be imported back into n8n
6. Data loss occurs if user didn't have other backups

Expected correct behavior:
1. User selects multiple workflows
2. Clicks export button
3. Browser downloads ZIP file containing separate JSON files
4. Each file is a valid n8n workflow that can be individually imported
5. ZIP also contains manifest.json with metadata

*Implementation Approach:*

Rather than patching n8n directly, FlowVault will provide an alternative export mechanism:
- Export button in FlowVault UI
- Workflow selection interface with bulk actions
- Server-side ZIP generation using archiver library
- Individual JSON file per workflow with proper formatting
- Manifest file with export metadata
- Download progress indicator for large exports
- Export history tracking for audit purposes

*Validation Requirements:*
- Each exported JSON must pass n8n's import validation
- ZIP structure must be consistent and documented
- Export of fifty workflows must complete under ten seconds
- Memory usage must stay under 512MB for exports up to 1000 workflows
- Concurrent exports by different users must not interfere

**Feature 3: ENV Variables Tab Removal**

The n8n workflow editor contains an ENV variables tab that serves no functional purpose in the current implementation. This tab confuses users who expect it to provide environment variable management capabilities similar to .env files.

*Current State Analysis:*

The ENV tab appears in the n8n editor but:
- Displays no content
- Provides no input fields
- Cannot be used to set environment variables
- Does not integrate with n8n's credential system
- Creates support burden due to user confusion

*Removal Strategy:*

Since FlowVault cannot modify n8n's source code, the removal will be implemented through:
- CSS injection to hide the tab via browser extension or custom UI overlay
- Documentation explaining that environment variables should be managed through n8n credentials
- Alternative UI in FlowVault dashboard for viewing workflow dependencies
- Migration guide for users who attempted to use the non-functional tab

*User Communication Plan:*
- In-app notification explaining the change
- Help documentation with screenshots
- Tutorial video showing proper environment variable management
- FAQ entry addressing common questions
- Support ticket template for users experiencing issues

### Out-of-Scope Features

To maintain focus and deliver Phase 1 on schedule, the following features are explicitly excluded:

**Deferred to Phase 2:**
- Multi-user collaboration features
- Workflow sharing marketplace
- Real-time collaborative editing
- Workflow templates and blueprints
- Advanced workflow analytics and visualization
- Performance profiling and optimization suggestions
- Integration with GitHub for version control
- Workflow CI/CD pipeline automation

**Deferred to Phase 3:**
- AI-powered workflow recommendations
- Automated workflow testing framework
- Disaster recovery orchestration
- Multi-region backup replication
- Workflow dependency mapping
- Change impact analysis
- Rollback automation with approval workflows

**Explicitly Not Planned:**
- Modifications to n8n source code
- Hosting of n8n instances
- Execution runtime for workflows
- Custom nodes or integrations
- Workflow execution monitoring
- Log aggregation and analysis

### Feature Dependencies and Prerequisites

**Hard Prerequisites (Must Complete Before Implementation):**

1. Clerk Authentication Setup
   - Clerk project created and configured
   - Publishable and secret keys obtained
   - Middleware configured in Next.js
   - User session management tested
   - Webhook endpoints configured for user lifecycle

2. Supabase Database Setup
   - All seven flowvault_* tables created
   - Indexes on frequently queried columns
   - Helper functions deployed
   - Trigger functions for updated_at automation
   - Row Level Security policies defined (even if not enforced yet)

3. Encryption Infrastructure
   - ENCRYPTION_KEY generated and stored securely
   - Key rotation mechanism designed
   - Encryption/decryption utility functions tested
   - IV generation and storage strategy validated

4. Development Environment
   - Local n8n instance running for testing
   - Test workflows created covering various scenarios
   - Environment variables configured in .env.local
   - TypeScript types generated from database schema

**Soft Prerequisites (Recommended But Not Blocking):**

1. Design System
   - UI component library selected (shadcn/ui)
   - Color palette and typography defined
   - Responsive breakpoints established
   - Loading and error state patterns

2. Monitoring Infrastructure
   - Error tracking service configured (Sentry)
   - Analytics platform integrated (Plausible or PostHog)
   - Logging aggregation (Logtail or similar)
   - Uptime monitoring (Checkly or UptimeRobot)

3. CI/CD Pipeline
   - GitHub Actions workflows configured
   - Automated testing on pull requests
   - Preview deployments for branches
   - Production deployment automation

### Success Criteria Definition

**Functional Completeness:**

Each feature must satisfy these criteria:

Backup System:
- User can enable automated backups
- User can set custom cron schedule
- User can trigger manual backup
- System creates backup versions correctly
- Deduplication reduces redundant storage
- User can view backup history
- User can restore from backup
- User can export backups
- User can delete old backups
- Audit log captures all operations

Export Bug Fix:
- Multi-workflow export produces valid ZIP
- Each workflow JSON is importable
- Export completes under performance targets
- No data corruption occurs
- Export history is maintained
- User can re-download previous exports

ENV Tab Removal:
- Tab is not visible to users
- No JavaScript errors occur
- Workflow editor remains fully functional
- Documentation explains the change
- Users can find alternative solutions

**Non-Functional Requirements:**

Performance:
- Page load time under two seconds
- API response time p95 under 500ms
- Backup operation completes in under five seconds
- Export operation completes in under ten seconds for fifty workflows
- Database queries complete in under 100ms

Security:
- Zero vulnerabilities in dependency audit
- All credentials encrypted at rest
- No credentials exposed in client-side code
- CSRF protection enabled
- Rate limiting prevents abuse
- Audit logs cannot be tampered with

Reliability:
- Ninety-nine point nine percent uptime
- Zero data loss incidents
- Automatic retry for transient failures
- Graceful degradation when n8n is unavailable
- Database transactions ensure consistency

Usability:
- New users can complete onboarding in under two minutes
- Error messages are actionable and clear
- UI is accessible (WCAG 2.1 Level AA)
- Works on mobile devices (responsive design)
- No user training required for basic features

**Acceptance Testing Criteria:**

Each feature will undergo acceptance testing:

Test Scenario 1: End-to-End Backup Flow
- User logs in with Clerk
- User connects n8n instance
- User enables automatic backups
- System successfully backs up all workflows
- User views backup history
- User restores a previous version
- Workflow functions correctly after restore

Test Scenario 2: Export Multiple Workflows
- User selects five workflows
- User clicks export button
- ZIP file downloads successfully
- ZIP contains five separate JSON files
- Each JSON imports successfully into n8n
- Imported workflows execute correctly

Test Scenario 3: UI Tab Removal
- User opens workflow in n8n
- ENV tab is not visible
- User can access all other tabs
- No console errors appear
- Workflow editing functions normally

### Scope Management and Change Control

**Change Request Process:**

Any modifications to the defined scope must:
1. Be submitted in writing with justification
2. Include impact analysis on timeline and resources
3. Be reviewed by technical lead
4. Receive stakeholder approval
5. Update this document with new version number

**Scope Creep Prevention:**

To prevent uncontrolled scope expansion:
- Weekly scope review meetings
- Feature freeze two weeks before launch
- "Parking lot" document for future ideas
- Strict adherence to Phase boundaries
- Technical debt log for shortcuts taken

---

## System Architecture Overview

### High-Level Architecture

FlowVault follows a modern three-tier architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Browser    │  │  Mobile Web  │  │  Tablet Web  │         │
│  │   (Desktop)  │  │              │  │              │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                  │
│         └─────────────────┼──────────────────┘                  │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            │ HTTPS/TLS 1.3
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                     APPLICATION TIER                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Next.js 15 Application                        │ │
│  │                                                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│  │  │   React UI   │  │  API Routes  │  │ Server       │   │ │
│  │  │  Components  │  │              │  │ Components   │   │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │ │
│  │                                                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│  │  │ Clerk Auth   │  │  n8n Proxy   │  │  Backup      │   │ │
│  │  │ Integration  │  │  Layer       │  │  Engine      │   │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────┬───────────────────────────┬───────────────────────┘
               │                           │
               │                           │
┌──────────────▼────────────┐  ┌──────────▼────────────────────────┐
│      DATA TIER            │  │   EXTERNAL SERVICES               │
│                           │  │                                   │
│  ┌──────────────────────┐ │  │  ┌──────────────────────┐        │
│  │  Supabase            │ │  │  │   n8n Instance       │        │
│  │  PostgreSQL          │ │  │  │   (User-Hosted)      │        │
│  │                      │ │  │  └──────────────────────┘        │
│  │  - User Settings     │ │  │                                   │
│  │  - Workflow Backups  │ │  │  ┌──────────────────────┐        │
│  │  - Archived Data     │ │  │  │   Upstash Redis      │        │
│  │  - Audit Logs        │ │  │  │   (Rate Limiting)    │        │
│  └──────────────────────┘ │  │  └──────────────────────┘        │
│                           │  │                                   │
│  ┌──────────────────────┐ │  │  ┌──────────────────────┐        │
│  │  Supabase Storage    │ │  │  │   Clerk Auth         │        │
│  │  (Backup Files)      │ │  │  │   (Sessions)         │        │
│  └──────────────────────┘ │  │  └──────────────────────┘        │
└───────────────────────────┘  └───────────────────────────────────┘
```

### Component Interaction Patterns

**Request Flow for Backup Operation:**

1. User triggers backup from FlowVault UI
2. React component calls Next.js API route: POST /api/backups/trigger
3. API route validates Clerk session token
4. Retrieves encrypted n8n credentials from flowvault_user_settings
5. Decrypts credentials using ENCRYPTION_KEY
6. Calls n8n API: GET /workflows to list all workflows
7. For each workflow, calculates SHA-256 hash of workflow JSON
8. Queries flowvault_workflow_backups for existing hash
9. If hash exists, skips backup (deduplication)
10. If hash is new, increments version number
11. Inserts new backup record into database
12. Stores workflow JSON in Supabase Storage
13. Writes audit log entry to flowvault_agent_audit_log
14. Returns success response to client
15. Client updates UI to show new backup

**Request Flow for Workflow Export:**

1. User selects workflows and clicks export
2. React component calls: POST /api/exports/create
3. API route validates session and retrieves n8n credentials
4. Fetches selected workflows from n8n API
5. Creates ZIP archive using archiver library
6. Adds each workflow as separate JSON file
7. Generates manifest.json with metadata
8. Streams ZIP to client with proper headers
9. Browser triggers download
10. Client shows success notification

### Technology Stack Detail

**Frontend Layer:**

Next.js 15 App Router:
- File-based routing with app directory
- Server Components for reduced client JavaScript
- Client Components for interactivity
- Suspense boundaries for loading states
- Error boundaries for fault isolation
- Parallel routes for complex layouts
- Intercepting routes for modals

React 18:
- Concurrent rendering for responsiveness
- Automatic batching for performance
- useTransition for non-urgent updates
- useDeferredValue for expensive computations
- Server Component patterns
- Client-only hooks for browser APIs

TypeScript 5:
- Strict mode enabled
- Path aliases for clean imports
- Utility types for database schemas
- Discriminated unions for type safety
- Template literal types for validation

Styling:
- Tailwind CSS for utility-first styling
- CSS Modules for component scoping
- shadcn/ui for pre-built components
- Radix UI primitives for accessibility
- CSS variables for theming

**Backend Layer:**

Next.js API Routes:
- Route handlers in app/api directory
- Middleware for authentication
- Edge runtime where applicable
- Streaming responses for large data
- Proper HTTP status codes
- Error handling middleware

Supabase Client:
- Automatic query generation
- Type-safe operations
- Real-time subscriptions
- Connection pooling
- Automatic retry logic
- Transaction support

Encryption:
- Node.js crypto module
- AES-256-GCM algorithm
- Random IV per encryption
- Authenticated encryption preventing tampering
- Constant-time comparison for security

**Data Layer:**

PostgreSQL via Supabase:
- JSONB columns for flexible schema
- GIN indexes on JSONB fields
- Partial indexes for performance
- Materialized views for reporting
- Database functions for complex queries
- Triggers for automation

Storage:
- Supabase Storage for backup files
- Organized bucket structure
- Automatic cleanup policies
- Signed URLs for temporary access
- CDN acceleration

**External Services:**

Clerk Authentication:
- Pre-built authentication UI
- Session management
- Webhook handlers for user events
- Social login providers
- Multi-factor authentication

Upstash Redis:
- Sliding window rate limiting
- Per-user request counters
- Automatic expiration
- Global replication
- REST API for serverless

### Deployment Architecture

**Hosting Infrastructure:**

Vercel Platform:
- Automatic deployments from GitHub
- Preview deployments per branch
- Edge network for global distribution
- Automatic HTTPS with custom domains
- Environment variable management
- Rollback capability

Supabase Platform:
- Managed PostgreSQL database
- Automatic backups
- Point-in-time recovery
- Connection pooling
- Read replicas (future scaling)

**Environment Strategy:**

Three environments with progressive rollout:

Development Environment:
- Local development with localhost
- Supabase local development instance
- Mock n8n API for testing
- Disabled rate limiting
- Verbose logging
- Hot module replacement

Staging Environment:
- Vercel preview deployment
- Supabase development project
- Real Clerk test mode
- Reduced rate limits
- Full logging enabled
- Test data seeding

Production Environment:
- Vercel production deployment
- Supabase production project
- Clerk production mode
- Full rate limiting
- Error-level logging only
- Real user data

**Scalability Considerations:**

Horizontal Scaling:
- Stateless application tier
- Database connection pooling
- CDN for static assets
- Edge functions for global performance

Vertical Scaling:
- Supabase tier upgrades available
- Larger Vercel compute instances
- Database read replicas

Performance Optimization:
- Server-side rendering for initial load
- Incremental static regeneration
- Image optimization
- Code splitting
- Tree shaking
- Compression

### Data Flow Architecture

**Credential Management Flow:**

```
User → Clerk Login → JWT Token → Next.js Middleware
                                       ↓
                              Validate Session
                                       ↓
                            Extract clerk_user_id
                                       ↓
                    Query flowvault_user_settings
                                       ↓
                    Retrieve encrypted credentials
                                       ↓
                       Decrypt with AES-256-GCM
                                       ↓
                     Use for n8n API requests
                                       ↓
                   Credentials NEVER sent to client
```

**Backup Deduplication Flow:**

```
Workflow JSON → Normalize (sort keys, remove whitespace)
                              ↓
                  Calculate SHA-256 Hash
                              ↓
              Query: SELECT id FROM flowvault_workflow_backups
                     WHERE clerk_user_id = ? 
                     AND workflow_id = ?
                     AND content_hash = ?
                              ↓
                ┌─────────────┴─────────────┐
                │                           │
           Hash Exists                 Hash New
                │                           │
         Skip Backup                Get Next Version
         (Deduplication)                    │
                │                    Insert Backup
                │                           │
                └───────────┬───────────────┘
                            │
                   Return Result to User
```

### Security Architecture Layers

**Layer 1: Network Security:**
- TLS 1.3 for all connections
- HSTS headers enforced
- Content Security Policy
- CORS restrictions
- DDoS protection via Vercel

**Layer 2: Authentication:**
- Clerk JWT validation
- HTTP-only cookies
- CSRF tokens
- Session expiration
- Device fingerprinting

**Layer 3: Authorization:**
- User can only access own data
- Clerk user ID as primary key
- Row-level filtering in queries
- API route authorization checks

**Layer 4: Data Protection:**
- Encryption at rest (AES-256-GCM)
- Encryption in transit (TLS)
- Encrypted database backups
- Key rotation capability
- Audit logging

**Layer 5: Application Security:**
- Input validation
- Output encoding
- SQL injection prevention via parameterized queries
- XSS prevention via React escaping
- Dependency vulnerability scanning

---

## Feature Specifications

### Feature 1: Automated Workflow Backup System

#### Functional Requirements

**FR-BACKUP-001: User Credential Configuration**

Users must be able to securely provide their n8n instance credentials through the FlowVault interface.

*Acceptance Criteria:*
- UI form accepts n8n instance URL with validation
- URL validation ensures https:// protocol
- API key input field with password masking
- Test connection button validates credentials
- Success feedback confirms connection
- Error messages explain connection failures
- Credentials encrypted before database storage
- Settings page allows credential updates
- Delete credentials with confirmation dialog

*Technical Implementation Notes:*
The credential form will use React Hook Form for validation with Zod schema. Client-side validation prevents malformed URLs. The test connection endpoint will make a simple GET request to /workflows with provided credentials. Upon successful validation, credentials are encrypted using AES-256-GCM with a unique IV stored alongside the ciphertext.

**FR-BACKUP-002: Backup Schedule Configuration**

Users must be able to configure automated backup schedules using cron syntax or preset options.

*Acceptance Criteria:*
- Enable/disable automated backups toggle
- Preset schedule options (hourly, daily, weekly)
- Custom cron expression input for advanced users
- Cron validation with user-friendly error messages
- Visual representation of next backup time
- Schedule preview showing next five execution times
- Schedule changes take effect immediately
- Timezone awareness for schedule interpretation

*Technical Implementation Notes:*
Use croner library for cron parsing and next execution calculation. Store cron expression in flowvault_user_settings.backup_schedule column. Background job runner (implemented as Vercel Cron Job) will query all users with backup_enabled=true and execute backups for those whose schedule matches current time. Timezone handling uses user's browser timezone converted to UTC for storage.

**FR-BACKUP-003: Manual Backup Triggering**

Users must be able to manually trigger a backup of all workflows or selected workflows at any time.

*Acceptance Criteria:*
- Backup all workflows button in dashboard
- Checkbox selection for individual workflows
- Bulk select/deselect functionality
- Backup button shows loading state during operation
- Progress indicator for multi-workflow backups
- Cancel operation during execution
- Success notification with backup count
- Error notification with failure details

*Technical Implementation Notes:*
The manual backup endpoint will accept an array of workflow IDs or null for all workflows. Rate limiting prevents abuse with maximum three manual backups per hour per user. The operation runs asynchronously with a job ID returned immediately. Client polls backup status endpoint every two seconds for updates. Cancellation sets a flag in Redis that the backup job checks between workflows.

**FR-BACKUP-004: Deduplication Engine**

The system must deduplicate identical workflow versions to minimize storage costs.

*Acceptance Criteria:*
- SHA-256 hash calculated for workflow JSON
- Normalization ensures consistent hashing
- Duplicate content skips database insertion
- Version number increments only for unique content
- Deduplication ratio displayed in dashboard
- Storage savings calculated and shown to user
- Hash collision handling (theoretically impossible but coded defensively)

*Technical Implementation Notes:*
Workflow JSON is normalized before hashing by sorting object keys recursively and removing all whitespace. The hash is calculated using Node.js crypto.createHash('sha256'). Database query checks for existing (clerk_user_id, workflow_id, content_hash) tuple. If found, backup operation returns "DEDUPLICATED" status. Deduplication metrics are calculated daily by aggregating backup records.

**FR-BACKUP-005: Backup History Viewing**

Users must be able to view complete history of all backup operations with filtering and search.

*Acceptance Criteria:*
- Chronological list of all backups
- Filter by workflow name
- Filter by date range
- Filter by backup type (manual vs scheduled)
- Search by workflow ID or tag
- Pagination for large datasets
- Sort by various columns
- View workflow JSON diff between versions

*Technical Implementation Notes:*
Backup history page uses server-side pagination with 50 records per page. Filters are implemented as URL query parameters for shareability. Database query uses composite index on (clerk_user_id, created_at DESC) for performance. JSON diff uses deep-diff library to highlight changes between versions. Diff view supports side-by-side and unified formats.

**FR-BACKUP-006: Workflow Restore**

Users must be able to restore a previous version of a workflow to their n8n instance.

*Acceptance Criteria:*
- Restore button next to each backup entry
- Confirmation dialog shows what will be restored
- Option to create backup of current version before restore
- Restore operation updates n8n workflow
- Success notification confirms restore
- Audit log records restore action
- Rollback capability if restore fails

*Technical Implementation Notes:*
Restore operation first creates a backup of the current workflow state before making changes. It then updates the workflow via n8n API PUT /workflows/:id with the backup JSON. If the PUT request fails, no changes are made. Success is verified by fetching the workflow again and comparing content hash. The audit log includes both the backup ID being restored from and the new backup ID created.

**FR-BACKUP-007: Tag Management**

Users must be able to organize backups using tags for easier categorization and retrieval.

*Acceptance Criteria:*
- Add tags during manual backup
- Edit tags on existing backups
- Tag autocomplete suggests existing tags
- Color-coded tag display
- Filter backups by tag
- Tag usage statistics
- Bulk tag operations
- Tag deletion with reassignment

*Technical Implementation Notes:*
Tags are stored in flowvault_workflow_tags table with normalized lowercase names. The backups table has a tags array column for many-to-many relationship. Tag autocomplete queries are debounced with 300ms delay. Colors are assigned using consistent hashing of tag name for visual consistency. Unused tags (usage_count = 0) are automatically deleted after 30 days.

#### Non-Functional Requirements

**NFR-BACKUP-001: Performance**

Backup operations must complete within acceptable time limits regardless of workflow complexity.

*Performance Targets:*
- Single workflow backup: under 2 seconds p95
- Ten workflows backup: under 10 seconds p95
- One hundred workflows backup: under 60 seconds p95
- Database query response: under 100ms p95
- UI page load: under 1.5 seconds p95

*Monitoring and Enforcement:*
Performance metrics collected using Vercel Analytics and custom instrumentation. Slow query log enabled in Supabase. Alerts triggered if p95 exceeds targets for three consecutive hours. Monthly performance review compares against baselines.

**NFR-BACKUP-002: Reliability**

The backup system must operate with high reliability to ensure no data loss.

*Reliability Targets:*
- Scheduled backup success rate: 99.5%
- Manual backup success rate: 99.9%
- Data corruption incidents: zero tolerance
- Mean time between failures: 720 hours
- Mean time to recovery: 15 minutes

*Fault Tolerance Mechanisms:*
Transient failures trigger automatic retry with exponential backoff up to three attempts. Circuit breaker pattern prevents cascading failures when n8n is down. Database transactions ensure atomic operations. Backup verification compares source and destination content hashes.

**NFR-BACKUP-003: Scalability**

The system must scale to handle thousands of workflows per user without degradation.

*Scalability Targets:*
- Maximum workflows per user: 10,000
- Maximum concurrent backup jobs: 100
- Maximum database size: 100GB
- Query performance maintained as data grows
- Horizontal scaling capability

*Scaling Strategy:*
Database uses partitioning by clerk_user_id for large tables. Background jobs distributed across multiple workers using queue system. Caching layer (Redis) reduces database load. Archival process moves old backups to cold storage after retention period.

**NFR-BACKUP-004: Security**

Backup operations must maintain strict security controls to protect sensitive workflow data.

*Security Requirements:*
- Credentials encrypted at rest using AES-256-GCM
- Credentials never exposed to client browser
- Audit log for all backup operations
- Rate limiting prevents abuse
- User can only access their own backups
- Backup data encrypted in Supabase Storage
- Key rotation supported

*Security Validation:*
Automated security scanning with npm audit and Snyk. Manual code review focuses on credential handling. Penetration testing before production launch. Regular security audits quarterly.

#### Edge Cases and Error Handling

**Edge Case: n8n Instance Unavailable**

Scenario: User's n8n instance is down or unreachable during scheduled backup.

*Handling Strategy:*
- Backup job records failure in audit log
- Retry attempted after 5 minutes
- If still failing, retry after 30 minutes
- If three consecutive failures, disable scheduled backups
- Email notification sent to user
- Dashboard shows alert about backup failures
- User can manually re-enable after resolving issue

**Edge Case: Workflow Deleted in n8n**

Scenario: Workflow exists in backup history but was deleted from n8n instance.

*Handling Strategy:*
- Backup history shows "Deleted in n8n" badge
- Restore button creates new workflow instead of updating
- User warned that workflow will be created as new
- Original workflow ID preserved in backup metadata
- Option to permanently delete from backup history

**Edge Case: Duplicate Workflow Names**

Scenario: User has multiple workflows with identical names in n8n.

*Handling Strategy:*
- Display workflow ID alongside name
- Include workflow ID in backup record
- Backup history shows unique identifier
- Search works on both name and ID
- Export filenames include ID to prevent collision

**Edge Case: Very Large Workflows**

Scenario: Workflow JSON exceeds 10MB due to complex node configurations.

*Handling Strategy:*
- Compression applied before storage
- Streaming upload to Supabase Storage
- Progress indicator shows upload status
- Timeout increased to 2 minutes
- Warning shown if workflow exceeds 5MB
- Suggestion to optimize workflow structure

**Edge Case: Database Connection Lost**

Scenario: Connection to Supabase is interrupted during backup operation.

*Handling Strategy:*
- Transaction automatically rolled back
- Retry logic with exponential backoff
- User sees "Retrying..." indicator
- After three failures, operation marked as failed
- Partial data never committed
- User can retry manually

### Feature 2: Export Bug Fix

#### Problem Analysis

**Current Bug Manifestation:**

The existing n8n export functionality exhibits a critical defect when users attempt to export multiple workflows simultaneously. The bug manifests in the following sequence:

User Action Sequence:
1. Navigate to workflows list in n8n UI
2. Select multiple workflows using checkboxes (e.g., five workflows)
3. Click the export button
4. Browser initiates download

Expected Behavior:
- Download contains five separate JSON files, one per workflow
- Each JSON file is valid and can be individually imported
- Alternatively, a properly formatted JSON array or ZIP archive

Actual Buggy Behavior:
- Single file downloads named "workflows.json"
- File contains concatenated JSON objects without array wrapper
- Malformed structure resembles: `{...workflow1...}{...workflow2...}{...workflow3...}`
- Import fails with JSON parse error
- Data cannot be recovered from the corrupted file

**Root Cause Analysis:**

Based on examination of typical export functionality patterns, the bug likely originates from:

1. Incorrect content-type header causing browser confusion
2. Stream writing without proper delimiters or array wrapper
3. Multiple response.write() calls without JSON array structure
4. Missing file archival step for multi-workflow exports
5. Frontend JavaScript concatenating responses incorrectly

**Impact Assessment:**

This bug has severe consequences:

User Impact:
- Data loss if corrupted file is the only backup
- Wasted time attempting to manually repair JSON
- Loss of confidence in platform reliability
- Increased support ticket volume
- Potential business disruption if workflows cannot be recovered

Business Impact:
- Negative user sentiment and reviews
- Increased churn risk
- Support burden on development team
- Reputation damage in automation community
- Competitive disadvantage vs. other automation platforms

#### Solution Design

**FlowVault Export Implementation:**

Since FlowVault cannot modify n8n source code, the solution provides an alternative export mechanism that users can rely on.

**Architecture:**

```
User Selection → FlowVault UI → API Route → n8n API
                                     ↓
                              Fetch Workflows
                                     ↓
                              Create ZIP Archive
                                     ↓
                          Add manifest.json
                                     ↓
                        Add individual workflow JSONs
                                     ↓
                            Stream to Browser
                                     ↓
                         Track Export History
```

**Export Format Specification:**

ZIP Archive Structure:
```
flowvault_export_2026-01-06_143025.zip
├── manifest.json
├── workflow_abc123_CustomerOnboarding.json
├── workflow_def456_DataSync.json
├── workflow_ghi789_EmailNotifications.json
└── README.txt
```

manifest.json Content:
```
{
  "version": "1.0",
  "exported_at": "2026-01-06T14:30:25.123Z",
  "exported_by": "user_abc123",
  "n8n_instance": "https://n8n.example.com",
  "workflow_count": 3,
  "workflows": [
    {
      "id": "abc123",
      "name": "Customer Onboarding",
      "filename": "workflow_abc123_CustomerOnboarding.json",
      "node_count": 15,
      "active": true,
      "tags": ["onboarding", "automation"]
    }
  ]
}
```

README.txt Content:
```
FlowVault Workflow Export
=========================

Export Date: January 6, 2026 at 2:30 PM
Total Workflows: 3

This ZIP archive contains your n8n workflows exported from FlowVault.
Each workflow is stored as a separate JSON file that can be individually
imported into any n8n instance.

Import Instructions:
1. Open your n8n instance
2. Navigate to Workflows
3. Click "Import from File"
4. Select one of the JSON files from this archive
5. Review and save the imported workflow

For support, visit: https://flowvault.app/support
```

#### Functional Requirements

**FR-EXPORT-001: Workflow Selection Interface**

Users must be able to select workflows for export with intuitive multi-select functionality.

*Acceptance Criteria:*
- Checkbox next to each workflow in list
- Select all / deselect all buttons
- Selected count indicator
- Disabled export button when no selection
- Visual highlight for selected workflows
- Keyboard navigation support
- Accessible to screen readers

**FR-EXPORT-002: Export Execution**

The export operation must reliably produce valid, importable workflow files.

*Acceptance Criteria:*
- Export button triggers API request
- Loading indicator during processing
- ZIP file downloads automatically
- Each workflow in separate JSON file
- Manifest file included
- README file included
- Files named descriptively with workflow name sanitized
- Special characters removed from filenames

**FR-EXPORT-003: Export Validation**

Exported files must pass validation to ensure importability.

*Acceptance Criteria:*
- Each JSON validates against n8n schema
- Workflow IDs preserved correctly
- Node configurations intact
- Credentials placeholders maintained
- Connections between nodes preserved
- Metadata (tags, active status) included
- No data corruption occurs

**FR-EXPORT-004: Export History Tracking**

Users must be able to view history of all exports for audit and re-download purposes.

*Acceptance Criteria:*
- Export history page shows all past exports
- Each entry shows date, time, workflow count
- Re-download button for recent exports (7 days)
- Automatic cleanup after retention period
- Search and filter capabilities
- Export metadata (user agent, IP) stored

#### Implementation Approach

**Phase 1: API Endpoint Development**

Create POST /api/exports/create endpoint:

Endpoint Specification:
- Method: POST
- Authentication: Required (Clerk session)
- Request Body: { workflow_ids: string[] }
- Response: Streaming ZIP file
- Headers: Content-Type: application/zip, Content-Disposition: attachment

Processing Steps:
1. Validate session and extract clerk_user_id
2. Retrieve user's n8n credentials from database
3. Decrypt credentials
4. Validate workflow_ids array is not empty
5. Check rate limit (max 10 exports per hour)
6. Initialize archiver instance
7. Create manifest object
8. For each workflow ID:
   - Fetch workflow from n8n API
   - Validate JSON structure
   - Sanitize workflow name for filename
   - Add to ZIP as workflow_{id}_{sanitized_name}.json
   - Update manifest
9. Add manifest.json to ZIP
10. Add README.txt to ZIP
11. Finalize archive
12. Stream to response
13. Record export in database
14. Return success

**Phase 2: Frontend Integration**

Create workflow selection UI:

Components:
- WorkflowList: Displays workflows with checkboxes
- ExportButton: Triggers export when clicked
- ExportProgress: Shows progress during export
- ExportHistory: Lists past exports

User Flow:
1. User navigates to workflows page
2. Workflows loaded from n8n via FlowVault proxy
3. User checks desired workflows
4. Selected count updates in real-time
5. User clicks Export Selected button
6. Confirmation dialog shows what will be exported
7. User confirms
8. Progress modal appears
9. Download starts automatically
10. Success notification shown
11. Export added to history

**Phase 3: Testing and Validation**

Test Scenarios:

Test Case 1: Export Single Workflow
- Select one workflow
- Export
- Verify ZIP contains one JSON file plus manifest and README
- Import JSON into fresh n8n instance
- Verify workflow functions correctly

Test Case 2: Export Multiple Workflows (5)
- Select five workflows
- Export
- Verify ZIP contains five JSON files
- Import each JSON separately
- Verify all execute correctly

Test Case 3: Export Large Workflow (100+ nodes)
- Select workflow with 100 nodes
- Export
- Verify file size is reasonable
- Import and verify all nodes present

Test Case 4: Export with Special Characters in Name
- Select workflow named "Test & Development #1"
- Export
- Verify filename is sanitized to "workflow_abc123_TestDevelopment1.json"
- Import succeeds

Test Case 5: Rate Limit Enforcement
- Export 11 times within one hour
- Verify 11th attempt is rate limited
- Error message explains limit
- Can export again after window resets

#### Error Handling

**Error Category: n8n API Failures**

Scenario: n8n instance returns 500 error during export

Handling:
- Catch error in try-catch block
- Log error details for debugging
- Return user-friendly error message
- Suggest checking n8n instance health
- Offer retry option
- Do not charge against rate limit

**Error Category: Network Timeouts**

Scenario: Network request to n8n times out after 30 seconds

Handling:
- Abort operation gracefully
- Clean up partial ZIP file
- Show timeout error to user
- Suggest smaller batch size
- Log timeout for monitoring
- Retry once automatically

**Error Category: Invalid Workflow Data**

Scenario: n8n returns malformed JSON for a workflow

Handling:
- Skip corrupted workflow
- Continue with remaining workflows
- Show warning notification
- List which workflows were skipped
- Offer export of individual workflow
- Report issue to support

### Feature 3: ENV Variables Tab Removal

#### Context and Rationale

The n8n workflow editor interface includes an ENV variables tab that creates user confusion due to its non-functional state. Users expect this tab to provide environment variable management similar to .env files or platform environment variables, but it currently serves no purpose.

**User Confusion Patterns:**

Support tickets reveal common misconceptions:
- Users attempt to define environment variables in the tab expecting them to be available in expressions
- Users assume the tab integrates with system environment variables
- Users believe it provides a way to configure deployment-specific values
- Users report the tab as "broken" when it does nothing

**Why Direct Removal Isn't Possible:**

FlowVault operates as a companion platform to n8n and cannot modify the n8n codebase directly because:
- n8n is a separate application with its own deployment
- Users may be running various n8n versions
- Patching n8n would create maintenance burden
- Fork maintenance is not sustainable
- Users may have official n8n support contracts

#### Solution Strategy

**Approach: CSS Injection via Browser Extension**

While FlowVault cannot modify n8n's code, it can provide users with a companion browser extension that hides the tab using CSS.

Extension Architecture:
```
Browser Extension (Chrome/Firefox)
        ↓
Content Script Injection
        ↓
Detect n8n Workflow Editor
        ↓
Inject CSS: #env-tab { display: none !important; }
        ↓
Tab Hidden from User View
```

**Alternative Approach: Documentation and Education**

Simultaneously educate users on proper environment variable management:
- Create comprehensive guide on n8n credentials
- Video tutorial on expression variables
- FAQ addressing ENV tab confusion
- Migration guide from attempted ENV usage to proper credentials

#### Functional Requirements

**FR-ENV-001: Browser Extension Development**

Develop browser extension for Chrome and Firefox that hides the ENV tab.

*Acceptance Criteria:*
- Extension available in Chrome Web Store
- Extension available in Firefox Add-ons
- One-click installation
- Works on all n8n instances (cloud and self-hosted)
- No performance impact on n8n
- User can toggle extension on/off
- Extension updates automatically
- Privacy-focused (no data collection)

**FR-ENV-002: Detection Logic**

Extension must reliably detect when user is viewing n8n workflow editor.

*Acceptance Criteria:*
- Detects official n8n cloud instances
- Detects self-hosted n8n instances
- Only activates on workflow editor page
- Does not affect other pages
- Handles n8n version differences
- Works across browser tabs
- Minimal CPU usage

**FR-ENV-003: Tab Hiding Implementation**

The ENV tab must be completely hidden from user view.

*Acceptance Criteria:*
- Tab is not visible in the interface
- Tab space is reclaimed by remaining tabs
- No console errors occur
- No JavaScript errors
- Workflow editor remains fully functional
- Keyboard shortcuts still work
- No visual glitches
- Works in light and dark mode

**FR-ENV-004: User Communication**

Users must be informed about the change and provided alternatives.

*Acceptance Criteria:*
- In-app notification about ENV tab removal
- Link to documentation explaining change
- Guide on using credentials properly
- Video tutorial embedded
- FAQ section
- Support contact information
- Feedback collection mechanism

#### Implementation Details

**Browser Extension Manifest:**

manifest.json structure:
```
{
  "manifest_version": 3,
  "name": "FlowVault - n8n ENV Tab Remover",
  "version": "1.0.0",
  "description": "Removes the non-functional ENV tab from n8n workflow editor",
  "permissions": ["activeTab"],
  "content_scripts": [
    {
      "matches": [
        "*://*.n8n.cloud/*",
        "*://*/workflow/*",
        "*://localhost:*/workflow/*"
      ],
      "js": ["content.js"],
      "css": ["hide-env-tab.css"],
      "run_at": "document_end"
    }
  ]
}
```

**CSS Implementation:**

hide-env-tab.css:
```
/* Hide ENV tab in n8n workflow editor */
[data-testid="env-tab"],
.env-tab,
#env-tab,
*[title*="ENV Variables"] {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
}
```

**Content Script Logic:**

content.js implementation:
```
Pseudo-code:

function detectN8nEditor() {
  check if URL contains "/workflow/"
  check if n8n-specific elements exist
  return boolean
}

function hideEnvTab() {
  find ENV tab element
  apply display: none
  remove from DOM
  adjust layout
}

if detectN8nEditor():
  hideEnvTab()
  observe DOM for dynamic tab creation
  reapply hiding if tab reappears
```

#### Documentation Requirements

**User Guide Structure:**

Section 1: Why the ENV Tab Was Removed
- Explanation of non-functional tab
- User confusion examples
- Support ticket statistics
- Benefits of removal

Section 2: How to Install the Extension
- Chrome installation steps with screenshots
- Firefox installation steps with screenshots
- Verification that extension is working
- Troubleshooting common issues

Section 3: Proper Environment Variable Management
- Using n8n credentials system
- Creating credential types
- Referencing credentials in nodes
- Expression variables and functions
- Static data vs dynamic configuration

Section 4: Migration Guide
- Identifying workflows that might have attempted ENV usage
- Converting to proper credential patterns
- Testing converted workflows
- Rollback procedures

Section 5: FAQ
- What happened to the ENV tab?
- Why can't FlowVault remove it directly?
- Is my workflow data affected?
- Will this break my existing workflows?
- Can I still use environment variables?
- What if I want to keep the tab visible?

---

## Implementation Strategy

### Development Methodology

**Agile-Inspired Approach:**

This implementation will follow an adapted agile methodology tailored for a small team with focused objectives:

Sprint Structure:
- Sprint duration: Two weeks
- Three sprints total for Phase 1
- Daily standups replaced with asynchronous updates
- Sprint planning at start of each sprint
- Sprint retrospective at end
- Continuous deployment to staging

Development Principles:
- Test-driven development for critical paths
- Code review before merge to main
- Feature flags for incomplete features
- Incremental delivery
- Continuous integration
- Documentation as code

**Quality Gates:**

Each feature must pass through sequential quality gates:

Gate 1: Unit Testing
- Minimum eighty percent code coverage
- All critical paths tested
- Edge cases covered
- Mocks for external dependencies

Gate 2: Integration Testing
- API endpoints tested end-to-end
- Database operations validated
- External service integration verified
- Error scenarios tested

Gate 3: Security Review
- Dependency audit passing
- Credential handling reviewed
- Input validation checked
- OWASP top 10 considerations

Gate 4: Performance Testing
- Load testing with realistic data volumes
- Response time benchmarks met
- Database query optimization verified
- Memory leak testing

Gate 5: User Acceptance Testing
- Feature works as specified
- User interface is intuitive
- Documentation is clear
- No blocking bugs remain

### Implementation Sequence

**Phase 1A: Foundation (Week 1-2)**

Objective: Establish core infrastructure and authentication.

Tasks:
1. Update TypeScript types to match flowvault_* prefixed tables
2. Create database access layer with typed functions
3. Implement Supabase client wrappers
4. Build credential encryption utilities
5. Create user settings management API
6. Develop settings page UI
7. Implement n8n connection testing
8. Add audit logging infrastructure
9. Set up error tracking (Sentry)
10. Configure rate limiting with Upstash

Deliverables:
- Users can create accounts via Clerk
- Users can configure n8n credentials
- Credentials are encrypted and stored
- Test connection validates n8n access
- Audit log tracks all operations

Success Criteria:
- User can complete onboarding in under 2 minutes
- Credentials encrypted with AES-256-GCM verified
- Test connection success rate above ninety-five percent
- Audit log captures all credential operations
- Zero security vulnerabilities in dependency scan

**Phase 1B: Backup System (Week 3-4)**

Objective: Implement automated and manual backup functionality with deduplication.

Tasks:
1. Create backup triggering API endpoint
2. Implement workflow fetching from n8n
3. Build SHA-256 deduplication engine
4. Develop version increment logic
5. Create database insertion layer
6. Implement backup history retrieval
7. Build backup list UI component
8. Add manual backup trigger button
9. Create backup schedule configuration UI
10. Implement cron job for scheduled backups
11. Build restore functionality
12. Add tag management system
13. Implement backup search and filtering
14. Create diff viewer component
15. Add export backup functionality

Deliverables:
- Users can manually trigger backups
- System automatically backs up on schedule
- Deduplication reduces storage by minimum sixty percent
- Backup history shows all versions
- Users can restore previous versions
- Tags organize backups effectively

Success Criteria:
- Backup completes in under 5 seconds for average workflow
- Deduplication working correctly (verified by hash checking)
- Scheduled backups execute within 1 minute of schedule time
- Restore success rate one hundred percent
- Zero data loss incidents

**Phase 1C: Export Fix (Week 5)**

Objective: Provide reliable multi-workflow export functionality.

Tasks:
1. Create export API endpoint
2. Implement ZIP archive generation
3. Build workflow selection UI
4. Add manifest.json generation
5. Create README.txt generation
6. Implement filename sanitization
7. Add export history tracking
8. Build export history UI
9. Add re-download functionality
10. Implement export validation
11. Create automated tests for export
12. Add rate limiting for exports
13. Build progress indicator
14. Add error handling for edge cases

Deliverables:
- Users can select multiple workflows
- Export produces valid ZIP file
- Each workflow in separate JSON
- Manifiest and README included
- Export history tracked
- Re-download available for 7 days

Success Criteria:
- One hundred percent of exports produce valid files
- All exported workflows can be imported successfully
- Export completes in under 10 seconds for 50 workflows
- Zero malformed file incidents
- User satisfaction high (measured via feedback)

**Phase 1D: ENV Tab Removal (Week 5-6)**

Objective: Remove confusing non-functional ENV tab and educate users.

Tasks:
1. Develop browser extension manifest
2. Implement content script injection
3. Create CSS for tab hiding
4. Build extension icon and UI
5. Add toggle for extension enable/disable
6. Test across n8n versions
7. Publish to Chrome Web Store
8. Publish to Firefox Add-ons
9. Create user documentation
10. Record tutorial video
11. Write migration guide
12. Build FAQ section
13. Add in-app notifications
14. Implement user feedback collection

Deliverables:
- Browser extensions published
- Documentation comprehensive
- Video tutorial available
- In-app guidance provided
- User support prepared

Success Criteria:
- Extension installs without errors
- ENV tab hidden successfully
- No impact on editor functionality
- User confusion reduced (measured via support tickets)
- Documentation rated helpful by users

**Phase 1E: Testing and Launch (Week 6)**

Objective: Comprehensive testing and production deployment.

Tasks:
1. Execute full regression test suite
2. Perform security penetration testing
3. Conduct load testing with realistic scenarios
4. Run accessibility audit
5. Complete browser compatibility testing
6. Execute user acceptance testing
7. Fix any blocking bugs discovered
8. Update all documentation
9. Create deployment runbook
10. Configure production environment
11. Set up monitoring and alerting
12. Deploy to production
13. Monitor for first 48 hours
14. Collect initial user feedback

Deliverables:
- All tests passing
- Security vulnerabilities resolved
- Performance targets met
- Production deployment successful
- Monitoring active

Success Criteria:
- Zero critical bugs in production
- Uptime ninety-nine point nine percent
- Performance within targets
- User feedback positive
- Support tickets manageable

### Code Organization Strategy

**Directory Structure:**

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx (dashboard home)
│   │   ├── backups/
│   │   │   ├── page.tsx (backup list)
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx (backup details)
│   │   │   └── components/
│   │   ├── exports/
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   └── workflows/
│   │       ├── page.tsx
│   │       └── components/
│   ├── api/
│   │   ├── backups/
│   │   │   ├── trigger/
│   │   │   │   └── route.ts
│   │   │   ├── history/
│   │   │   │   └── route.ts
│   │   │   └── restore/
│   │   │       └── route.ts
│   │   ├── exports/
│   │   │   ├── create/
│   │   │   │   └── route.ts
│   │   │   └── history/
│   │   │       └── route.ts
│   │   ├── settings/
│   │   │   └── route.ts
│   │   └── n8n/
│   │       └── proxy/
│   │           └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/ (shadcn components)
│   ├── backup/
│   │   ├── BackupList.tsx
│   │   ├── BackupTrigger.tsx
│   │   ├── BackupHistory.tsx
│   │   ├── BackupRestore.tsx
│   │   ├── DiffViewer.tsx
│   │   └── TagManager.tsx
│   ├── export/
│   │   ├── WorkflowSelector.tsx
│   │   ├── ExportButton.tsx
│   │   └── ExportHistory.tsx
│   └── settings/
│       ├── CredentialForm.tsx
│       ├── ScheduleConfig.tsx
│       └── RetentionConfig.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── types.ts
│   ├── encryption/
│   │   ├── encrypt.ts
│   │   ├── decrypt.ts
│   │   └── keyManagement.ts
│   ├── n8n/
│   │   ├── client.ts
│   │   ├── workflows.ts
│   │   └── types.ts
│   ├── backup/
│   │   ├── deduplication.ts
│   │   ├── versioning.ts
│   │   └── scheduler.ts
│   ├── export/
│   │   ├── zipGenerator.ts
│   │   ├── manifestBuilder.ts
│   │   └── validator.ts
│   ├── audit/
│   │   └── logger.ts
│   ├── rate-limit/
│   │   └── upstash.ts
│   └── utils/
│       ├── validation.ts
│       ├── formatting.ts
│       └── constants.ts
└── types/
    ├── database.ts
    ├── n8n.ts
    └── api.ts
```

**Module Boundaries:**

Each module has clear responsibilities:

Database Layer (lib/supabase/):
- Raw database access
- Type-safe query builders
- Transaction management
- Connection pooling

Business Logic Layer (lib/[domain]/):
- Domain-specific operations
- Business rule enforcement
- Data transformation
- Validation logic

API Layer (app/api/):
- Request handling
- Authentication
- Response formatting
- Error handling

UI Layer (components/ and app/):
- User interface rendering
- User interactions
- State management
- Client-side validation

**Code Standards:**

TypeScript Configuration:
- Strict mode enabled
- No implicit any
- Unused locals detected
- Null checks enforced

Naming Conventions:
- Components: PascalCase (BackupList.tsx)
- Functions: camelCase (fetchWorkflows)
- Constants: UPPER_SNAKE_CASE (MAX_RETRY_ATTEMPTS)
- Types: PascalCase (BackupRecord)
- Files: kebab-case for routes, PascalCase for components

Function Structure:
- Single responsibility principle
- Maximum 50 lines per function
- Early returns for guard clauses
- Explicit error handling
- JSDoc comments for public APIs

Component Structure:
- Props interface defined
- Default props when applicable
- Hooks before JSX
- Helper functions extracted
- Accessibility attributes included

### Testing Strategy Details

**Unit Testing:**

Framework: Vitest with React Testing Library

Coverage Requirements:
- Utility functions: ninety-five percent coverage
- Business logic: ninety percent coverage
- Components: eighty percent coverage
- API routes: eighty-five percent coverage

Test Organization:
```
__tests__/
├── unit/
│   ├── lib/
│   │   ├── encryption.test.ts
│   │   ├── deduplication.test.ts
│   │   └── validation.test.ts
│   └── components/
│       ├── BackupList.test.tsx
│       └── CredentialForm.test.tsx
├── integration/
│   ├── api/
│   │   ├── backups.test.ts
│   │   └── exports.test.ts
│   └── flows/
│       ├── backup-workflow.test.ts
│       └── export-workflow.test.ts
└── e2e/
    ├── backup.spec.ts
    ├── export.spec.ts
    └── settings.spec.ts
```

**Integration Testing:**

Framework: Vitest with Supabase test database

Test Scenarios:
- API endpoint to database round trip
- n8n API integration
- Encryption/decryption cycle
- Backup and restore flow
- Export and import validation

Test Database:
- Separate Supabase project for testing
- Seeded with realistic test data
- Reset between test runs
- Isolated from development database

**End-to-End Testing:**

Framework: Playwright

Critical Paths:
- User signup and onboarding
- Credential configuration
- Manual backup trigger
- Scheduled backup execution
- Workflow restore
- Multi-workflow export
- Export history viewing

Test Environment:
- Staging deployment used
- Test n8n instance configured
- Realistic workflows created
- All browsers tested (Chrome, Firefox, Safari)

**Performance Testing:**

Framework: k6 for load testing

Scenarios:
- Concurrent backup operations
- Large workflow backup (1000+ nodes)
- Mass export (100 workflows)
- Database query performance
- API response times

Metrics Collected:
- Requests per second
- P50, P95, P99 latency
- Error rate
- Database connection pool usage
- Memory consumption

**Security Testing:**

Tools:
- npm audit for dependency vulnerabilities
- Snyk for deeper security scanning
- OWASP ZAP for penetration testing
- Manual code review for credentials handling

Test Scenarios:
- SQL injection attempts
- XSS attack vectors
- CSRF token validation
- Session hijacking prevention
- Rate limit bypass attempts
- Credential exposure checking

### Deployment Strategy

**Continuous Integration:**

GitHub Actions Workflow:
- Trigger on push to any branch
- Run linting (ESLint)
- Run type checking (tsc)
- Run unit tests
- Run integration tests
- Build Next.js application
- Report coverage to Codecov

Pull Request Checks:
- All tests must pass
- Coverage must not decrease
- No security vulnerabilities
- Code review approval required

**Continuous Deployment:**

Vercel Integration:
- Main branch → Production deployment
- Other branches → Preview deployments
- Automatic deployment on merge
- Rollback capability
- Environment variables from Vercel settings

Deployment Pipeline:
```
Code Push → GitHub
    ↓
GitHub Actions CI
    ↓
Tests Pass → Vercel Build
    ↓
Preview Deployment
    ↓
Manual Approval
    ↓
Production Deployment
    ↓
Health Checks
    ↓
Monitoring Active
```

**Environment Configuration:**

Development:
- .env.local with development credentials
- Local Supabase instance (optional)
- Vercel preview deployment
- Debug logging enabled

Staging:
- Vercel preview deployment
- Supabase development project
- Clerk test mode
- Realistic test data
- Full logging

Production:
- Vercel production deployment
- Supabase production project
- Clerk production mode
- Error-level logging only
- Real user data

**Database Migrations:**

Migration Strategy:
- All schema changes as migrations
- Migrations versioned and tracked
- Applied via Supabase MCP tool
- Rollback scripts for each migration
- Test migrations on staging first

Migration Naming:
- Format: YYYYMMDD_HHMMSS_description.sql
- Example: 20260106_143000_add_backup_tags.sql

Migration Process:
1. Write migration SQL
2. Write rollback SQL
3. Test on local database
4. Apply to staging
5. Verify staging functionality
6. Apply to production
7. Monitor for issues
8. Keep rollback script ready

**Rollback Procedures:**

Application Rollback:
- Vercel instant rollback to previous deployment
- DNS cutover if needed
- Database state may need attention
- Clear CDN cache

Database Rollback:
- Run rollback migration script
- Verify data integrity
- Redeploy application if schema incompatible
- Communicate downtime if needed

### Risk Mitigation Strategy

**Technical Risks:**

Risk: n8n API Rate Limiting
- Probability: High
- Impact: Medium
- Mitigation: Exponential backoff, request queuing, user communication
- Detection: Monitor 429 response codes
- Response: Implement circuit breaker, inform user

Risk: Data Loss During Backup
- Probability: Low
- Impact: Critical
- Mitigation: Transactional operations, content verification, redundancy
- Detection: Hash mismatch, restore validation failures
- Response: Alert immediately, restore from database backup

Risk: Encryption Key Compromise
- Probability: Very Low
- Impact: Critical
- Mitigation: Key rotation mechanism, access controls, audit logging
- Detection: Unusual access patterns, unauthorized decryption attempts
- Response: Rotate keys immediately, notify users, security audit

Risk: Database Performance Degradation
- Probability: Medium
- Impact: High
- Mitigation: Proper indexing, query optimization, connection pooling
- Detection: Slow query logs, monitoring alerts
- Response: Add indexes, optimize queries, scale database tier

**Operational Risks:**

Risk: Service Downtime (Vercel/Supabase)
- Probability: Low
- Impact: High
- Mitigation: Multi-region deployment, status page monitoring
- Detection: Health check failures, user reports
- Response: Communicate via status page, failover if available

Risk: Support Ticket Overload
- Probability: Medium
- Impact: Medium
- Mitigation: Comprehensive documentation, in-app help, FAQ
- Detection: Ticket queue depth
- Response: Hire additional support, improve self-service

Risk: Security Breach
- Probability: Very Low
- Impact: Critical
- Mitigation: Security best practices, penetration testing, audit logging
- Detection: Intrusion detection, unusual activity patterns
- Response: Incident response plan, user notification, remediation

**Business Risks:**

Risk: Low User Adoption
- Probability: Medium
- Impact: High
- Mitigation: User research, intuitive UI, clear value proposition
- Detection: Analytics showing low signups or retention
- Response: User interviews, feature adjustments, marketing

Risk: Competitor Launch
- Probability: Medium
- Impact: Medium
- Mitigation: Fast execution, unique features, strong community
- Detection: Market monitoring
- Response: Differentiate features, accelerate roadmap

---

## Technical Architecture Deep Dive

### Database Design Philosophy

**Normalization Strategy:**

FlowVault's database follows third normal form (3NF) with pragmatic denormalization where performance benefits outweigh redundancy costs.

Normalized Tables:
- flowvault_user_settings: One row per user, no repeating groups
- flowvault_workflow_backups: One row per backup version, atomic values
- flowvault_workflow_tags: Separate table for tag definitions

Denormalized Elements:
- workflow_name stored in backups table (avoids join with n8n)
- usage_count in tags table (faster tag popularity queries)
- last_backup_at in user_settings (avoids MAX query)

**Index Strategy:**

Primary Indexes (Automatic):
- Primary key on id column for all tables
- Unique index on clerk_user_id in user_settings
- Unique composite on (clerk_user_id, tag_name) in tags

Performance Indexes:
- (clerk_user_id, created_at DESC) on backups for history queries
- (clerk_user_id, workflow_id, version DESC) for latest version lookup
- (content_hash) on backups for deduplication checks
- (clerk_user_id, tags) GIN index for tag filtering

Query Optimization:
- EXPLAIN ANALYZE used for all queries over 100ms
- Partial indexes for is_active=true records
- Covering indexes to avoid table lookups

**Connection Management:**

Supabase provides connection pooling:
- PgBouncer in transaction mode
- Maximum 15 connections per database
- Connection timeout: 30 seconds
- Query timeout: 60 seconds

Application-Level Pooling:
- Supabase client reused across requests
- No connection per request overhead
- Lazy connection establishment

### API Design Patterns

**RESTful Endpoint Structure:**

Resource-Oriented URLs:
- GET /api/backups - List backups
- POST /api/backups - Create backup
- GET /api/backups/[id] - Get specific backup
- DELETE /api/backups/[id] - Delete backup
- POST /api/backups/[id]/restore - Restore backup

HTTP Method Semantics:
- GET: Idempotent, read-only, cacheable
- POST: Create resource, non-idempotent
- PUT: Update resource, idempotent
- DELETE: Remove resource, idempotent
- PATCH: Partial update (not used in Phase 1)

**Request/Response Format:**

Standard Request Structure:
```
POST /api/backups
Headers:
  Authorization: Bearer <clerk_jwt>
  Content-Type: application/json
Body:
{
  "workflow_ids": ["abc123", "def456"],
  "tags": ["production", "release-2.0"],
  "backup_type": "manual"
}
```

Standard Success Response:
```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "backup_ids": ["uuid1", "uuid2"],
    "deduplicated_count": 1,
    "timestamp": "2026-01-06T14:30:25.123Z"
  },
  "metadata": {
    "request_id": "req_xyz789"
  }
}
```

Standard Error Response:
```
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "INVALID_WORKFLOW_ID",
    "message": "Workflow ID 'invalid' does not exist",
    "details": {
      "workflow_id": "invalid",
      "suggestion": "Check workflow ID in n8n"
    }
  },
  "metadata": {
    "request_id": "req_xyz789"
  }
}
```

**Error Code Taxonomy:**

Authentication Errors (401):
- UNAUTHORIZED: No valid session
- EXPIRED_SESSION: Session expired
- INVALID_TOKEN: Malformed JWT

Authorization Errors (403):
- FORBIDDEN: User lacks permission
- RESOURCE_NOT_OWNED: Accessing other user's resource

Validation Errors (400):
- INVALID_INPUT: Request validation failed
- MISSING_REQUIRED_FIELD: Required field absent
- INVALID_FORMAT: Field format incorrect

Resource Errors (404):
- NOT_FOUND: Resource doesn't exist
- WORKFLOW_NOT_FOUND: Workflow ID invalid

Rate Limiting (429):
- RATE_LIMIT_EXCEEDED: Too many requests
- QUOTA_EXCEEDED: Monthly limit reached

Server Errors (500):
- INTERNAL_ERROR: Unexpected server error
- DATABASE_ERROR: Database operation failed
- EXTERNAL_SERVICE_ERROR: n8n/Supabase failure

**Pagination Pattern:**

Cursor-Based Pagination:
- Suitable for real-time data
- No page drift issues
- Efficient for large datasets

Pagination Request:
```
GET /api/backups?limit=50&cursor=eyJ0aW1lc3RhbXAiOjE3MDQ4...

Response:
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJ0aW1lc3RhbXAiOjE3MDQ4...",
    "has_more": true,
    "total_count": 234
  }
}
```

### Encryption Architecture

**Symmetric Encryption (AES-256-GCM):**

Algorithm Selection Rationale:
- AES-256: Industry standard, FIPS compliant
- GCM mode: Authenticated encryption prevents tampering
- Built-in authentication tag validates integrity
- Parallel encryption/decryption for performance

Key Management:
- Master key stored in environment variable ENCRYPTION_KEY
- 256-bit key (32 bytes) generated via crypto.randomBytes
- Base64 encoded for storage
- Never logged or exposed to client
- Rotation mechanism designed (not implemented in Phase 1)

Initialization Vector (IV):
- Random 12-byte IV generated per encryption
- Stored alongside ciphertext in database
- Never reused for same key
- Ensures semantic security

Encryption Process:
```
Plaintext (n8n API key)
    ↓
Generate Random IV (12 bytes)
    ↓
Create Cipher (AES-256-GCM, master key, IV)
    ↓
Encrypt Plaintext
    ↓
Extract Auth Tag (16 bytes)
    ↓
Store: IV || Ciphertext || Auth Tag (base64 encoded)
```

Decryption Process:
```
Stored Encrypted Data (base64)
    ↓
Decode from Base64
    ↓
Extract IV (first 12 bytes)
    ↓
Extract Auth Tag (last 16 bytes)
    ↓
Extract Ciphertext (remaining bytes)
    ↓
Create Decipher (AES-256-GCM, master key, IV)
    ↓
Set Auth Tag
    ↓
Decrypt Ciphertext
    ↓
Verify Auth Tag (automatic)
    ↓
Return Plaintext
```

**Security Considerations:**

Threat: Key Exposure via Logs
- Mitigation: Never log decrypted values, sanitize logs
- Detection: Log analysis for credential patterns
- Response: Rotate keys, audit access

Threat: IV Reuse
- Mitigation: Always generate fresh random IV
- Detection: Database constraint on IV uniqueness (if implemented)
- Response: Re-encrypt with new IV

Threat: Timing Attacks
- Mitigation: Constant-time comparison for authentication tags
- Detection: Timing analysis in security audit
- Response: Use crypto.timingSafeEqual

### Rate Limiting Architecture

**Implementation with Upstash Redis:**

Sliding Window Algorithm:
- More accurate than fixed window
- Prevents burst at window boundaries
- Memory efficient

Rate Limit Structure:
```
Key: ratelimit:backup:manual:{clerk_user_id}
Value: [
  {timestamp: 1704549600, count: 1},
  {timestamp: 1704549700, count: 1},
  {timestamp: 1704549800, count: 1}
]
TTL: 3600 seconds (1 hour)
```

Check Algorithm:
1. Get current timestamp
2. Calculate window start (current - limit period)
3. Fetch all entries from Redis
4. Filter entries within window
5. Sum counts
6. Compare against limit
7. If under limit, add new entry
8. If over limit, return error with retry-after

Limits by Operation:
- Manual backup: 10 per hour
- Scheduled backup: Unlimited (controlled by cron)
- Export: 10 per hour
- Settings update: 20 per hour
- n8n connection test: 5 per hour

**Fallback Mechanism:**

If Upstash is unavailable:
- Fall back to database-based rate limiting
- Use flowvault_rate_limit_counters table
- Slower but ensures protection
- Monitor fallback usage
- Alert if Upstash down for more than 5 minutes

Database Rate Limit Query:
```
SELECT COUNT(*) 
FROM flowvault_rate_limit_counters
WHERE clerk_user_id = $1
  AND action_type = $2
  AND window_start <= NOW()
  AND window_end > NOW()
```

### Caching Strategy

**Server-Side Caching:**

User Settings Cache:
- TTL: 5 minutes
- Invalidation: On settings update
- Storage: Vercel Edge Config (future) or in-memory

Workflow List Cache:
- TTL: 1 minute
- Invalidation: On backup, Manual refresh
- Storage: Redis or Next.js cache

**Client-Side Caching:**

React Query Configuration:
- Stale time: 30 seconds
- Cache time: 5 minutes
- Refetch on window focus: true
- Retry: 3 attempts with exponential backoff

Cache Keys:
```
['backups', clerk_user_id]
['backups', clerk_user_id, workflow_id]
['workflows', clerk_user_id]
['settings', clerk_user_id]
```

Optimistic Updates:
- Backup trigger: Immediately add to cache
- Delete backup: Immediately remove from cache
- Update settings: Immediately update cache
- Revert on error

**CDN Caching:**

Static Assets:
- Cache-Control: public, max-age=31536000, immutable
- Includes: JavaScript, CSS, images, fonts

API Responses:
- No caching for authenticated endpoints
- Cache-Control: private, no-cache, no-store, must-revalidate

---

## Database Schema & Data Flow

### Table Specifications

**flowvault_user_settings**

Purpose: Store per-user configuration and encrypted n8n credentials.

Schema Definition:
- id: UUID primary key, default uuid_generate_v4()
- clerk_user_id: TEXT unique not null (references Clerk user)
- n8n_instance_url: TEXT not null (user's n8n URL)
- n8n_api_key_encrypted: TEXT not null (AES-256-GCM encrypted)
- encryption_iv: TEXT not null (base64 encoded IV)
- backup_enabled: BOOLEAN default true
- backup_schedule: TEXT default '0 0 * * *' (cron expression)
- last_backup_at: TIMESTAMPTZ nullable
- retention_days: INTEGER default 30
- created_at: TIMESTAMPTZ default now()
- updated_at: TIMESTAMPTZ default now()

Indexes:
- PRIMARY KEY (id)
- UNIQUE INDEX (clerk_user_id)
- INDEX (backup_enabled, backup_schedule) for cron job queries

Triggers:
- BEFORE UPDATE: flowvault_update_updated_at_column()

Access Patterns:
- SELECT by clerk_user_id (most common)
- UPDATE settings by clerk_user_id
- SELECT WHERE backup_enabled = true (cron job)

Row Level Security:
- Users can only SELECT/UPDATE/DELETE their own row
- Policy: clerk_user_id = current_setting('app.clerk_user_id')
- Note: RLS not enforced in Phase 1, application-level filtering used

**flowvault_workflow_backups**

Purpose: Store versioned backups of workflows with deduplication.

Schema Definition:
- id: UUID primary key
- clerk_user_id: TEXT not null
- workflow_id: TEXT not null (n8n workflow ID)
- workflow_name: TEXT not null
- workflow_data: JSONB not null (complete workflow JSON)
- content_hash: TEXT not null (SHA-256 hash for deduplication)
- version: INTEGER not null (incremental version number)
- tags: TEXT[] default empty array
- is_active: BOOLEAN default true (soft delete flag)
- backup_type: TEXT default 'scheduled' (manual|scheduled|restore)
- created_at: TIMESTAMPTZ default now()

Indexes:
- PRIMARY KEY (id)
- INDEX (clerk_user_id, workflow_id, version DESC) for version lookup
- INDEX (clerk_user_id, created_at DESC) for history listing
- INDEX (content_hash) for deduplication checks
- GIN INDEX (tags) for tag filtering
- UNIQUE (clerk_user_id, workflow_id, version) prevents duplicate versions

Constraints:
- CHECK (version > 0) ensures positive version numbers
- CHECK (backup_type IN ('manual', 'scheduled', 'restore'))

Access Patterns:
- INSERT new backup (with deduplication check first)
- SELECT latest version: ORDER BY version DESC LIMIT 1
- SELECT backup history with pagination
- SELECT WHERE tag && ARRAY['production']

Storage Considerations:
- JSONB column compressed by PostgreSQL
- Large workflows (>100KB) may benefit from TOAST storage
- Deduplication significantly reduces actual storage

**flowvault_archived_workflows**

Purpose: Store workflows that have been archived from n8n.

Schema Definition:
- id: UUID primary key
- clerk_user_id: TEXT not null
- workflow_id: TEXT not null
- workflow_name: TEXT not null
- workflow_data: JSONB not null
- tags: TEXT[] default empty array
- archived_at: TIMESTAMPTZ default now()
- archived_from_n8n: BOOLEAN default false
- last_backup_id: UUID nullable (references backup table)

Indexes:
- PRIMARY KEY (id)
- INDEX (clerk_user_id, archived_at DESC)
- INDEX (workflow_id) for workflow lookup
- GIN INDEX (tags)

Access Patterns:
- INSERT when workflow archived
- SELECT archived workflows list
- UPDATE when moving to trash
- Rare DELETE (only from trash)

Relationship to Backups:
- last_backup_id links to flowvault_workflow_backups
- Allows restoring from last known good state
- May be null if workflow archived before first backup

**flowvault_trash**

Purpose: Soft-delete storage with 30-day retention before permanent deletion.

Schema Definition:
- id: UUID primary key
- clerk_user_id: TEXT not null
- workflow_id: TEXT not null
- workflow_name: TEXT not null
- workflow_data: JSONB not null
- tags: TEXT[] default empty array
- deleted_at: TIMESTAMPTZ default now()
- permanent_delete_at: TIMESTAMPTZ default (now() + interval '30 days')
- source: TEXT default 'active' (active|archived)

Indexes:
- PRIMARY KEY (id)
- INDEX (clerk_user_id, deleted_at DESC)
- INDEX (permanent_delete_at) for cleanup job

Access Patterns:
- INSERT when workflow deleted
- SELECT trash contents
- DELETE when user empties trash
- Automatic DELETE by cleanup job when permanent_delete_at < now()

Cleanup Job:
- Runs daily via cron
- Calls flowvault_cleanup_expired_trash() function
- Permanently deletes expired items
- Logs deletions to audit log

**flowvault_agent_audit_log**

Purpose: Comprehensive audit trail for compliance and debugging.

Schema Definition:
- id: UUID primary key
- clerk_user_id: TEXT nullable (null for system actions)
- agent_name: TEXT not null (backup|export|restore|system)
- action: TEXT not null (create|read|update|delete|restore)
- status: TEXT not null (success|failure|pending)
- metadata: JSONB nullable (action-specific details)
- dry_run: BOOLEAN default false
- approval_required: BOOLEAN default false
- approved_by: TEXT nullable
- approved_at: TIMESTAMPTZ nullable
- created_at: TIMESTAMPTZ default now()

Indexes:
- PRIMARY KEY (id)
- INDEX (clerk_user_id, created_at DESC) for user audit trail
- INDEX (agent_name, created_at DESC) for agent-specific queries
- GIN INDEX (metadata) for JSONB queries

Access Patterns:
- INSERT for every significant action
- SELECT for audit trail viewing
- SELECT for debugging failures
- Minimal UPDATE (approval workflow only)
- Never DELETE (immutable log)

Metadata Examples:
```
{
  "workflow_id": "abc123",
  "workflow_name": "Customer Onboarding",
  "backup_id": "def456",
  "version": 5,
  "deduplication": "skipped",
  "duration_ms": 234
}
```

Retention Policy:
- Keep all records for 90 days
- Archive to cold storage after 90 days
- Permanent retention for compliance-required events

**flowvault_workflow_tags**

Purpose: Normalized tag management with usage tracking.

Schema Definition:
- id: UUID primary key
- clerk_user_id: TEXT not null
- tag_name: TEXT not null (lowercase normalized)
- color: TEXT nullable (hex color code)
- usage_count: INTEGER default 0
- created_at: TIMESTAMPTZ default now()

Indexes:
- PRIMARY KEY (id)
- UNIQUE (clerk_user_id, tag_name)
- INDEX (clerk_user_id, usage_count DESC) for popular tags

Access Patterns:
- INSERT when new tag created
- UPDATE usage_count when tag applied/removed
- SELECT for tag autocomplete
- DELETE when usage_count reaches 0 (cleanup job)

Tag Naming Rules:
- Lowercase only
- Alphanumeric and hyphens allowed
- Maximum 50 characters
- Trimmed of whitespace

Color Assignment:
- User-specified or auto-generated
- Consistent hashing ensures same color across sessions
- Palette of 20 predefined colors

**flowvault_rate_limit_counters**

Purpose: Fallback rate limiting when Upstash Redis is unavailable.

Schema Definition:
- id: UUID primary key
- clerk_user_id: TEXT not null
- action_type: TEXT not null (backup|export|settings)
- counter: INTEGER default 0
- window_start: TIMESTAMPTZ not null
- window_end: TIMESTAMPTZ not null

Indexes:
- PRIMARY KEY (id)
- INDEX (clerk_user_id, action_type, window_end DESC)

Access Patterns:
- INSERT or UPDATE on rate limit check
- SELECT WHERE window_end > now()
- DELETE WHERE window_end < now() - interval '1 hour'

Window Management:
- 1-hour sliding window
- Cleanup job removes expired windows
- Counter incremented per request
- Compared against action-specific limits

Fallback Activation:
- Primary: Upstash Redis
- Fallback: This database table
- Monitoring alerts if fallback used frequently

### Data Consistency Guarantees

**Transaction Boundaries:**

Backup Operation Transaction:
```
BEGIN;
  -- Check for deduplication
  SELECT id FROM flowvault_workflow_backups 
  WHERE clerk_user_id = $1 
    AND workflow_id = $2 
    AND content_hash = $3;
  
  -- If not duplicate
  IF not_found THEN
    -- Get next version
    SELECT COALESCE(MAX(version), 0) + 1 
    FROM flowvault_workflow_backups
    WHERE clerk_user_id = $1 AND workflow_id = $2;
    
    -- Insert backup
    INSERT INTO flowvault_workflow_backups (...) VALUES (...);
    
    -- Update last_backup_at
    UPDATE flowvault_user_settings 
    SET last_backup_at = NOW()
    WHERE clerk_user_id = $1;
    
    -- Insert audit log
    INSERT INTO flowvault_agent_audit_log (...) VALUES (...);
  END IF;
COMMIT;
```

Benefits of Transactional Approach:
- Atomicity: All-or-nothing operations
- Consistency: Data never in invalid state
- Isolation: Concurrent backups don't interfere
- Durability: Committed data persists

**Concurrency Control:**

Optimistic Locking:
- Version numbers prevent lost updates
- Concurrent backups of same workflow create different versions
- Last write wins for user_settings updates

Pessimistic Locking (where needed):
- SELECT FOR UPDATE when critical
- Row-level locks prevent race conditions
- Minimal lock duration to reduce contention

Deadlock Prevention:
- Consistent lock ordering
- Short transaction duration
- Retry logic with exponential backoff

**Data Integrity Constraints:**

Foreign Key Constraints:
- Not used in Phase 1 to avoid circular dependencies
- Application-level referential integrity
- Future enhancement: Add FKs after schema stabilizes

Check Constraints:
- Version > 0 ensures valid versions
- Backup type enumeration prevents typos
- Positive integers for counters

Unique Constraints:
- clerk_user_id in user_settings
- (clerk_user_id, tag_name) in tags
- (clerk_user_id, workflow_id, version) in backups

### Data Migration Patterns

**Schema Evolution Strategy:**

Migration Versioning:
- Timestamp-based naming: YYYYMMDD_HHMMSS_description
- Sequential application order
- Rollback script for each migration
- Test on staging before production

Migration Types:

Additive Migrations (Safe):
- Add new columns with defaults
- Add new indexes
- Add new tables
- Can be applied with zero downtime

Destructive Migrations (Risky):
- Remove columns
- Change column types
- Remove constraints
- Require careful planning

**Zero-Downtime Migration Pattern:**

For breaking changes:
1. Add new column with default
2. Deploy code that writes to both old and new
3. Backfill data from old to new
4. Deploy code that reads from new
5. Remove old column in later migration

Example: Renaming Column
```
-- Step 1: Add new column
ALTER TABLE flowvault_workflow_backups 
ADD COLUMN workflow_name_new TEXT;

-- Step 2: Backfill data
UPDATE flowvault_workflow_backups 
SET workflow_name_new = workflow_name;

-- Step 3: Make new column NOT NULL
ALTER TABLE flowvault_workflow_backups 
ALTER COLUMN workflow_name_new SET NOT NULL;

-- Later: Drop old column
ALTER TABLE flowvault_workflow_backups 
DROP COLUMN workflow_name;

-- Rename new column
ALTER TABLE flowvault_workflow_backups 
RENAME COLUMN workflow_name_new TO workflow_name;
```

### Backup and Recovery

**Database Backup Strategy:**

Supabase Automatic Backups:
- Daily backups retained for 7 days (free tier)
- Point-in-time recovery to any second in last 7 days (paid tier)
- Cross-region replication available

Application-Level Backups:
- Export database schema weekly
- Store schema in version control
- Test restore procedure monthly

**Disaster Recovery Procedures:**

Scenario: Complete Database Loss
1. Create new Supabase project
2. Apply migrations from version control
3. Restore from latest Supabase backup
4. Verify data integrity
5. Update application connection strings
6. Resume operations

Recovery Time Objective (RTO): 4 hours
Recovery Point Objective (RPO): 24 hours

Scenario: Corrupted Table
1. Identify corruption timestamp
2. Use point-in-time recovery to restore table
3. Verify restored data
4. Merge changes since recovery point
5. Resume operations

RTO: 1 hour
RPO: 1 hour

Scenario: Accidental Data Deletion
1. Identify deleted records from audit log
2. Query database backup for deleted data
3. Restore deleted records via INSERT
4. Verify restoration
5. Update audit log

RTO: 30 minutes
RPO: 0 (soft deletes prevent data loss)

---

## API Design & Integration Patterns

### n8n API Integration

**Authentication with n8n:**

API Key Authentication:
- n8n uses API key in X-N8N-API-KEY header
- FlowVault stores encrypted API key
- Decrypts on-demand for each request
- Never passes to client

Request Pattern:
```
FlowVault API Route
    ↓
Retrieve user settings from database
    ↓
Decrypt n8n API key
    ↓
Create HTTP client with headers:
  - X-N8N-API-KEY: decrypted_key
  - Content-Type: application/json
    ↓
Make request to user's n8n instance
    ↓
Handle response/errors
    ↓
Return to client
```

**n8n API Endpoints Used:**

GET /workflows
- Lists all workflows
- Returns: Array of workflow objects
- Pagination: None (n8n returns all)
- Filtering: None (done client-side)

GET /workflows/:id
- Retrieves specific workflow
- Returns: Full workflow JSON
- Includes: Nodes, connections, settings

PUT /workflows/:id
- Updates existing workflow
- Body: Complete workflow JSON
- Returns: Updated workflow

POST /workflows
- Creates new workflow
- Body: Workflow JSON
- Returns: Created workflow with ID

DELETE /workflows/:id
- Deletes workflow
- Returns: Success confirmation

**Error Handling:**

n8n Error Responses:
```
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```

FlowVault Translation:
```
{
  "success": false,
  "error": {
    "code": "N8N_UNAUTHORIZED",
    "message": "Your n8n credentials are invalid. Please update them in settings.",
    "details": {
      "n8n_instance": "https://n8n.example.com",
      "suggestion": "Check that your API key is correct"
    }
  }
}
```

Common n8n Errors:
- 401 Unauthorized: Invalid API key
- 404 Not Found: Workflow doesn't exist
- 429 Too Many Requests: Rate limited
- 500 Internal Server Error: n8n is down
- Network errors: Instance unreachable

**Retry Logic:**

Transient Error Retry:
- 429, 500, 502, 503, 504 status codes
- Network timeouts
- Connection refused

Retry Strategy:
- Maximum 3 attempts
- Exponential backoff: 1s, 2s, 4s
- Jitter to prevent thundering herd
- Circuit breaker if consistent failures

Non-Retryable Errors:
- 400 Bad Request: Invalid workflow JSON
- 401 Unauthorized: Wrong credentials
- 403 Forbidden: Insufficient permissions
- 404 Not Found: Resource doesn't exist

### Clerk Authentication Integration

**Session Management:**

Session Flow:
```
User Login via Clerk
    ↓
Clerk Issues JWT
    ↓
JWT Stored in HTTP-Only Cookie
    ↓
Cookie Sent with Each Request
    ↓
Next.js Middleware Validates JWT
    ↓
clerk_user_id Extracted
    ↓
Passed to API Route
    ↓
Used for Database Queries
```

Middleware Configuration:
- Public routes: /, /login, /signup
- Protected routes: /dashboard/*, /api/* (except webhooks)
- Automatic redirect to login if unauthenticated

**User Identification:**

Clerk User ID:
- Unique identifier: user_abc123xyz
- Stable across sessions
- Used as foreign key in FlowVault tables
- Never changes even if email changes

User Metadata:
- Email: Available from Clerk
- Name: Available from Clerk
- Avatar: Available from Clerk
- Not duplicated in FlowVault database

**Webhook Integration:**

Clerk sends webhooks for:
- user.created: New user signed up
- user.updated: User changed email/profile
- user.deleted: User account deleted

Webhook Handler:
```
POST /api/webhooks/clerk
    ↓
Verify Webhook Signature
    ↓
Parse Event Type
    ↓
Switch on Event:
  - user.created: Create user_settings row
  - user.updated: No action needed
  - user.deleted: Soft delete all user data
    ↓
Return 200 OK
```

Data Deletion on user.deleted:
- Set deleted_at timestamp on all records
- Do not hard delete immediately
- Retain for 30 days for recovery
- Permanent deletion after retention period

### Supabase Integration Patterns

**Client Configuration:**

Server-Side Client:
```
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})
```

Service role key bypasses RLS (used in API routes).

Client-Side Client:
```
export const supabaseClient = createClient(
  supabaseUrl, 
  supabaseAnonKey, 
  {
    auth: {
      persistSession: false
    }
  }
)
```

Anon key respects RLS (used in components if needed).

**Query Patterns:**

Type-Safe Queries:
```
const { data, error } = await supabaseServer
  .from('flowvault_workflow_backups')
  .select('*')
  .eq('clerk_user_id', userId)
  .eq('workflow_id', workflowId)
  .order('version', { ascending: false })
  .limit(1)
  .single()

if (error) {
  throw new Error(`Database error: ${error.message}`)
}

return data
```

Typed Response:
```
const data: {
  id: string
  clerk_user_id: string
  workflow_id: string
  workflow_name: string
  workflow_data: Record<string, any>
  content_hash: string
  version: number
  tags: string[]
  is_active: boolean
  backup_type: string
  created_at: string
} | null
```

**Real-Time Subscriptions:**

For future dashboard updates:
```
const subscription = supabaseClient
  .channel('backup_updates')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'flowvault_workflow_backups',
      filter: `clerk_user_id=eq.${userId}`
    },
    (payload) => {
      // Update UI with new backup
      addBackupToList(payload.new)
    }
  )
  .subscribe()

subscription.unsubscribe()
```

Not implemented in Phase 1 but architecture supports it.

### Upstash Redis Integration

**Rate Limiting Implementation:**

Sliding Window Counter:
```
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

export const backupRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  analytics: true
})

const identifier = `backup:manual:${clerk_user_id}`
const { success, limit, remaining, reset } = await backupRateLimit.limit(identifier)

if (!success) {
  return res.status(429).json({
    error: 'RATE_LIMIT_EXCEEDED',
    message: `Maximum ${limit} manual backups per hour. Try again in ${Math.ceil((reset - Date.now()) / 1000)} seconds.`,
    retry_after: reset
  })
}
```

Rate Limit Headers:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1704553200
```

**Distributed Locking:**

For preventing concurrent operations:
```
import { Redis } from '@upstash/redis'

const redis = new Redis({...})

async function acquireLock(key: string, ttl: number): Promise<boolean> {
  const lockKey = `lock:${key}`
  const acquired = await redis.set(lockKey, 'locked', {
    ex: ttl,
    nx: true // Only set if not exists
  })
  return acquired === 'OK'
}

async function releaseLock(key: string): Promise<void> {
  await redis.del(`lock:${key}`)
}

const lockKey = `backup:${clerk_user_id}:${workflow_id}`
const locked = await acquireLock(lockKey, 30)

if (!locked) {
  throw new Error('Backup already in progress for this workflow')
}

try {
  await performBackup()
} finally {
  await releaseLock(lockKey)
}
```

**Caching Layer:**

User Settings Cache:
```
const cacheKey = `settings:${clerk_user_id}`
const cached = await redis.get(cacheKey)

if (cached) {
  return JSON.parse(cached as string)
}

const settings = await fetchFromDatabase()
await redis.set(cacheKey, JSON.stringify(settings), { ex: 300 }) // 5 min TTL

return settings
```

Cache Invalidation:
```
async function updateUserSettings(userId: string, updates: any) {
  await database.update(updates)
  await redis.del(`settings:${userId}`) // Invalidate cache
}
```

---

## Security Architecture

### Authentication Security

**Clerk JWT Validation:**

Token Structure:
```
Header:
{
  "alg": "RS256",
  "typ": "JWT"
}

Payload:
{
  "sub": "user_abc123xyz",
  "iat": 1704549600,
  "exp": 1704553200,
  "iss": "https://clerk.flowvault.app"
}

Signature:
RS256(base64(header) + "." + base64(payload), privateKey)
```

Validation Steps:
1. Extract JWT from Authorization header or cookie
2. Verify signature using Clerk's public key
3. Check expiration timestamp
4. Verify issuer matches expected value
5. Extract user ID from sub claim

Middleware Implementation:
```
export default clerkMiddleware()

import { auth } from '@clerk/nextjs/server'

export async function GET(request: Request) {
  const { userId } = await auth()
  
  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Use userId for database queries
}
```

**Session Security:**

HTTP-Only Cookies:
- Cookie not accessible via JavaScript
- Prevents XSS attacks from stealing session
- Secure flag ensures HTTPS-only transmission
- SameSite=Lax prevents CSRF

Session Expiration:
- Default: 7 days of inactivity
- Absolute max: 30 days
- Sliding window refreshes on activity
- Forced logout after max duration

Multi-Device Sessions:
- Multiple sessions per user allowed
- Each device has independent session
- User can revoke sessions in Clerk dashboard

**API Key Security:**

n8n API Key Storage:
- Never stored in plaintext
- Encrypted with AES-256-GCM before database insert
- Unique IV per encryption
- Decrypted only when needed for n8n requests
- Never sent to browser client

Encryption Flow:
```
User submits n8n API key
    ↓
Server validates key by testing connection
    ↓
Generate random 12-byte IV
    ↓
Encrypt key with AES-256-GCM
    ↓
Store ciphertext + IV in database
    ↓
Clear key from memory
```

Decryption Flow:
```
Need to call n8n API
    ↓
Fetch encrypted key + IV from database
    ↓
Decrypt using master key
    ↓
Use for n8n request
    ↓
Clear decrypted key from memory immediately
```

### Authorization Security

**Resource Ownership Validation:**

Every database query filters by clerk_user_id:
```
const backup = await db.from('flowvault_workflow_backups')
  .select('*')
  .eq('id', backupId)
  .single()

const backup = await db.from('flowvault_workflow_backups')
  .select('*')
  .eq('id', backupId)
  .eq('clerk_user_id', userId) // <- Critical
  .single()
```

Authorization Helper:
```
async function getBackupForUser(
  backupId: string, 
  userId: string
): Promise<Backup | null> {
  const backup = await db
    .from('flowvault_workflow_backups')
    .select('*')
    .eq('id', backupId)
    .eq('clerk_user_id', userId)
    .single()
    
  if (!backup.data) {
    throw new Error('Backup not found or access denied')
  }
  
  return backup.data
}
```

**Row Level Security (Future):**

While not enforced in Phase 1, RLS policies are designed:
```
CREATE POLICY user_access_own_backups
ON flowvault_workflow_backups
FOR ALL
USING (clerk_user_id = current_setting('app.clerk_user_id', true));
```

To enable RLS in future:
1. Implement session variable setting
2. Call set_config in transaction
3. Enable RLS on tables
4. Remove application-level filtering

### Input Validation

**Request Validation:**

Using Zod for type-safe validation:
```
import { z } from 'zod'

const CreateBackupSchema = z.object({
  workflow_ids: z.array(z.string().uuid()).min(1).max(100),
  tags: z.array(z.string().max(50)).max(10).optional(),
  backup_type: z.enum(['manual', 'scheduled']).default('manual')
})

const body = await request.json()
const validated = CreateBackupSchema.safeParse(body)

if (!validated.success) {
  return Response.json({
    error: 'INVALID_INPUT',
    details: validated.error.format()
  }, { status: 400 })
}

const { workflow_ids, tags, backup_type } = validated.data
```

URL Parameter Validation:
```
const WorkflowIdSchema = z.string().min(1).max(200)

const workflowId = WorkflowIdSchema.parse(params.id)
```

**SQL Injection Prevention:**

Supabase client uses parameterized queries automatically:
```
await db.from('flowvault_workflow_backups')
  .select('*')
  .eq('workflow_id', userInput) // userInput safely escaped
```

Never construct raw SQL with user input:
```
const query = `SELECT * FROM flowvault_workflow_backups WHERE workflow_id = '${userInput}'`
```

**XSS Prevention:**

React Automatic Escaping:
```
<div>{userWorkflowName}</div>
```

Dangerous HTML Rendering (avoid):
```
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

Content Security Policy:
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://clerk.flowvault.app;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.supabase.io https://api.upstash.io;
```

### Encryption Standards

**Encryption Algorithm Details:**

AES-256-GCM Parameters:
- Key size: 256 bits (32 bytes)
- IV size: 96 bits (12 bytes recommended for GCM)
- Tag size: 128 bits (16 bytes authentication tag)
- Mode: Galois/Counter Mode (authenticated encryption)

Why GCM Mode:
- Combines confidentiality and authenticity
- Faster than CBC with HMAC
- Parallel encryption/decryption
- Resistant to padding oracle attacks

**Key Management:**

Master Key Generation:
```
const crypto = require('crypto')
const masterKey = crypto.randomBytes(32).toString('base64')
```

Key Storage:
- Development: .env.local file
- Production: Vercel environment variables
- Never committed to version control
- Separate key per environment

Key Rotation Plan (Future):
1. Generate new master key
2. Store as ENCRYPTION_KEY_V2
3. Decrypt all credentials with old key
4. Re-encrypt with new key
5. Update database records with new ciphertext
6. Remove old key after migration complete
7. Update ENCRYPTION_KEY to V2

**Encryption Implementation:**

Encrypt Function:
```
import crypto from 'crypto'

interface EncryptedData {
  ciphertext: string
  iv: string
}

export function encrypt(plaintext: string): EncryptedData {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'base64')
  const iv = crypto.randomBytes(12)
  
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64')
  ciphertext += cipher.final('base64')
  
  const tag = cipher.getAuthTag()
  
  // Combine ciphertext and tag
  const combined = Buffer.concat([
    Buffer.from(ciphertext, 'base64'),
    tag
  ]).toString('base64')
  
  return {
    ciphertext: combined,
    iv: iv.toString('base64')
  }
}
```

Decrypt Function:
```
export function decrypt(encrypted: EncryptedData): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'base64')
  const iv = Buffer.from(encrypted.iv, 'base64')
  
  const combined = Buffer.from(encrypted.ciphertext, 'base64')
  
  // Split ciphertext and tag
  const ciphertext = combined.slice(0, -16)
  const tag = combined.slice(-16)
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  
  let plaintext = decipher.update(ciphertext, undefined, 'utf8')
  plaintext += decipher.final('utf8')
  
  return plaintext
}
```

Error Handling:
```
try {
  const decrypted = decrypt(encryptedData)
  return decrypted
} catch (error) {
  if (error.message.includes('Unsupported state or unable to authenticate data')) {
    throw new Error('Decryption failed - data may be corrupted or tampered with')
  }
  throw error
}
```

### Secure Communication

**HTTPS Enforcement:**

TLS Configuration:
- Minimum version: TLS 1.2
- Preferred version: TLS 1.3
- Cipher suites: Modern, secure algorithms only
- Certificate: Automatic via Vercel/Let's Encrypt

HSTS Header:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Forces all connections to HTTPS for one year.

**API Security Headers:**

Complete Header Set:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

Next.js Configuration:
```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
        ]
      }
    ]
  }
}
```

---

## Error Handling & Resilience

### Error Classification

**Categorization by Severity:**

Critical Errors (Immediate attention required):
- Data loss or corruption
- Security breach
- Complete service outage
- Payment processing failure
- Database connection loss

High Priority Errors (Fix within 24 hours):
- Feature completely broken
- Backup failures affecting multiple users
- Authentication issues
- Performance degradation (>5x normal)

Medium Priority Errors (Fix within 1 week):
- Non-critical feature issues
- UI glitches
- Export failures for specific workflows
- Intermittent errors

Low Priority Errors (Backlog):
- Minor UI inconsistencies
- Enhancement requests
- Edge case handling
- Performance optimization opportunities

### Implementation Strategy - My Approach

**Phased Development Execution:**

I will implement Phase 1 using the following strategy:

Week 1-2: Foundation Layer
- Start with database utilities and type definitions
- Build encryption module with comprehensive tests
- Implement Clerk middleware integration
- Create user settings CRUD operations
- Establish error handling patterns
- Set up logging infrastructure

Why this order: Foundation must be rock-solid before building features. Encryption and auth are security-critical and need extra testing time.

Week 3-4: Backup System Core
- Implement backup triggering logic
- Build deduplication engine with SHA-256
- Create versioning system
- Develop restore functionality
- Add tag management
- Build backup history UI

Why this order: Backup is the most complex feature and needs the most time. Core functionality first, then UI polish.

Week 5: Export and ENV Removal
- Create export ZIP generation
- Build workflow selection UI
- Develop browser extension
- Write comprehensive documentation
- Create video tutorials

Why this order: These are simpler features that can be completed quickly once backup system proves the architecture works.

Week 6: Testing and Launch
- Execute full test suite
- Fix all blocking bugs
- Performance optimization
- Security audit
- Deploy to production
- Monitor intensively for first 48 hours

Why this order: Dedicated testing time ensures quality. Launch monitoring catches issues immediately.

**Quality Assurance Strategy:**

My testing approach:
1. Write tests BEFORE implementing features (TDD for critical paths)
2. Run tests locally before every commit
3. Automated testing in CI pipeline
4. Manual testing of user flows
5. Security review by external expert
6. Performance benchmarking against targets
7. User acceptance testing with beta users

I will not compromise on:
- Security testing (encryption, auth, authorization)
- Data integrity testing (backups, restores)
- Error handling (every code path tested)
- Performance targets (will optimize until met)

I will be pragmatic about:
- UI polish (functional first, beautiful second)
- Edge case handling (cover 95% of cases, document rest)
- Documentation (comprehensive but not perfect)

**Risk Management Approach:**

My mitigation strategy for top risks:

Risk: Encryption implementation bugs
- Mitigation: Use battle-tested crypto library, not custom crypto
- Validation: Security expert review, penetration testing
- Fallback: Quick key rotation if vulnerability found

Risk: n8n API changes breaking integration
- Mitigation: Abstract n8n client, version detection
- Validation: Test against multiple n8n versions
- Fallback: Graceful degradation, user notifications

Risk: Database performance issues at scale
- Mitigation: Proper indexing from start, query optimization
- Validation: Load testing with realistic data volumes
- Fallback: Database tier upgrade, query caching

Risk: Running out of time
- Mitigation: Focus on MVP, defer nice-to-haves
- Validation: Weekly progress review, scope adjustment
- Fallback: Push non-critical features to Phase 2

---

## Success Metrics & KPIs

### User Adoption Metrics

**Primary Metrics:**

Sign-up Conversion Rate:
- Target: 15% of landing page visitors sign up
- Measurement: Google Analytics funnel
- Success threshold: 10% minimum

Onboarding Completion:
- Target: 80% complete initial setup
- Steps: Account creation → Credential configuration → First backup
- Time to first backup: Under 5 minutes

Active User Retention:
- Day 7 retention: 60%
- Day 30 retention: 40%
- Day 90 retention: 25%

Feature Adoption:
- Automated backups enabled: 50% of users
- Manual backups used: 80% of users
- Exports used: 40% of users
- Restore used: 10% of users (normal, only needed when issues occur)

### Technical Performance Metrics

**Response Time Targets:**

API Endpoints:
- GET /api/backups: p95 < 300ms
- POST /api/backups/trigger: p95 < 5000ms
- POST /api/exports/create: p95 < 10000ms
- PUT /api/settings: p95 < 200ms

Page Load Times:
- Dashboard: p95 < 2000ms
- Backup history: p95 < 2500ms
- Settings page: p95 < 1500ms

**Reliability Metrics:**

Uptime:
- Target: 99.9% (43 minutes downtime per month)
- Measurement: Uptime monitoring service
- Alerting: Immediate on downtime

Error Rate:
- Target: < 0.1% of requests result in 5xx errors
- Measurement: Application logs aggregation
- Alerting: Spike detection

Backup Success Rate:
- Scheduled backups: 99.5% success
- Manual backups: 99.9% success
- Restore operations: 100% success

Data Integrity:
- Zero data loss incidents
- Zero corruption incidents
- 100% restore verification passes

### Business Metrics

**Growth Indicators:**

User Growth:
- Month 1: 100 users
- Month 3: 500 users
- Month 6: 2000 users

Workflow Coverage:
- Average workflows per user: 10
- Total workflows backed up: 20,000 by month 6

Storage Efficiency:
- Deduplication ratio: > 60%
- Average storage per user: < 100MB
- Total storage usage: < 200GB by month 6

**Financial Metrics:**

Infrastructure Costs:
- Supabase: $25/month (Pro tier)
- Vercel: $20/month (Pro tier)
- Upstash: $10/month
- Clerk: $25/month
- Total: $80/month initially

Cost Per User:
- Target: < $0.50/user/month
- Includes: Compute, storage, bandwidth
- Optimization: Reduce to $0.30 by month 6

### Quality Metrics

**Code Quality:**

Test Coverage:
- Overall: > 80%
- Critical paths: > 95%
- Utilities: > 90%
- UI components: > 75%

Code Review:
- 100% of code reviewed before merge
- Average time to review: < 24 hours
- Issues per review: < 3

Technical Debt:
- Track in dedicated backlog
- Address 1 debt item per sprint
- No critical debt unaddressed

**User Satisfaction:**

Net Promoter Score (NPS):
- Target: > 30 (industry average for B2B SaaS)
- Survey: Monthly to active users
- Follow-up: Contact detractors within 48 hours

Support Tickets:
- Average response time: < 4 hours
- Resolution time: < 24 hours for critical, < 1 week for others
- Ticket volume: Decrease over time as docs improve

Feature Requests:
- Track in public roadmap
- Prioritize based on frequency + impact
- Implement top requests in Phase 2

---

## Conclusion

This comprehensive implementation plan provides a detailed roadmap for delivering FlowVault Phase 1. The plan emphasizes:

**Quality Over Speed:**
- Thorough testing at every layer
- Security-first architecture
- Comprehensive documentation

**User-Centric Design:**
- Solving real pain points
- Intuitive interfaces
- Clear communication

**Technical Excellence:**
- Modern technology stack
- Scalable architecture
- Maintainable codebase

**Risk Mitigation:**
- Identified potential issues
- Mitigation strategies defined
- Fallback plans ready

**Measurable Success:**
- Clear KPIs defined
- Monitoring infrastructure in place
- Continuous improvement mindset

The 6-week timeline is ambitious but achievable with focused execution. The phased approach allows for course correction while maintaining momentum toward launch.

Phase 1 establishes the foundation for FlowVault's long-term vision of becoming the essential workflow management platform for n8n users. Success in Phase 1 will validate the product-market fit and provide a springboard for Phase 2 features including multi-user collaboration, advanced analytics, and marketplace integration.

**Next Steps:**

1. Finalize technology choices and obtain necessary accounts
2. Set up development environment
3. Create project repository with initial structure
4. Begin Week 1 implementation tasks
5. Establish daily progress tracking
6. Schedule weekly stakeholder updates

**Commitment to Excellence:**

This implementation will succeed because:
- The problem is real and well-understood
- The solution is technically sound
- The plan is comprehensive yet flexible
- The team is committed to quality
- Users are eager for these features

Let's build something great.

---

**End of Phase 1 Implementation Plan**

*Document Total: 4000+ lines*
*Prepared by: GitHub Copilot (Claude Sonnet 4.5)*
*Date: January 6, 2026*
