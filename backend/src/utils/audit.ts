import { prisma } from '../config/prisma';

export interface AuditLogInput {
  organizationId: string;
  actorId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, any>;
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId || null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId || null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Non-blocking: audit log failure should not crash primary user action
  }
}
