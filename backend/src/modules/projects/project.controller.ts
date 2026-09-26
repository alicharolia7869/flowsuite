import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../utils/audit';
import { assertEntitlementLimit } from '../../utils/entitlements';

export async function listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId, role } = req.tenant!;
    const userId = req.user!.id;
    const { status, search } = req.query as { status?: string; search?: string };

    const where: any = { organizationId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.name = { contains: search };
    }

    // Role-based visibility: MEMBER can only see projects they have tasks assigned in
    if (role === 'MEMBER') {
      const assignedTasks = await prisma.task.findMany({
        where: { organizationId, assigneeId: userId },
        select: { projectId: true },
      });
      const assignedProjectIds = [...new Set(assignedTasks.map(t => t.projectId))];
      where.id = { in: assignedProjectIds };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        tasks: {
          select: { id: true, status: true },
        },
        customers: {
          select: { id: true, name: true, company: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = projects.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      totalTasks: p.tasks?.length || 0,
      completedTasks: p.tasks?.filter((t: any) => t.status === 'DONE').length || 0,
      customerCount: p.customers?.length || 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    res.status(200).json({ projects: mapped });
  } catch (error) {
    next(error);
  }
}

export async function getProjectById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId, role } = req.tenant!;
    const { id } = req.params;
    const userId = req.user!.id;

    const project = await prisma.project.findFirst({
      where: { id, organizationId },
      include: {
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        customers: true,
      },
    });

    if (!project) {
      throw new AppError('Project not found or not accessible within this organization.', 'NOT_FOUND', 404);
    }

    // If role is MEMBER, verify user has assigned tasks in this project
    if (role === 'MEMBER') {
      const isAssigned = project.tasks?.some((t: any) => t.assigneeId === userId);
      if (!isAssigned) {
        throw new AppError('Permission denied. You are not assigned to this project.', 'FORBIDDEN', 403);
      }
    }

    res.status(200).json({ project });
  } catch (error) {
    next(error);
  }
}

export async function createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.tenant!;
    const { name, description, status } = req.body;

    // Enforce PROJECT_LIMIT via Entitlement Engine
    await assertEntitlementLimit(organizationId, 'PROJECT_LIMIT');

    const project = await prisma.project.create({
      data: {
        organizationId,
        name,
        description: description || null,
        status: status || 'PLANNING',
      },
    });

    // Update usage counters
    const currentProjectsCount = await prisma.project.count({ where: { organizationId } });
    await prisma.usageCounter.update({
      where: { organizationId },
      data: { projectsUsed: currentProjectsCount },
    }).catch(() => {});

    await createAuditLog({
      organizationId,
      actorId: req.user?.id,
      action: 'PROJECT_CREATED',
      targetType: 'Project',
      targetId: project.id,
      metadata: { name: project.name, status: project.status },
    });

    res.status(201).json({
      message: 'Project created successfully.',
      project,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.tenant!;
    const { id } = req.params;
    const { name, description, status } = req.body;

    const existing = await prisma.project.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new AppError('Project not found in this organization.', 'NOT_FOUND', 404);
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
      },
    });

    await createAuditLog({
      organizationId,
      actorId: req.user?.id,
      action: 'PROJECT_UPDATED',
      targetType: 'Project',
      targetId: id,
      metadata: { changes: req.body },
    });

    res.status(200).json({
      message: 'Project updated successfully.',
      project: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.tenant!;
    const { id } = req.params;

    const existing = await prisma.project.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new AppError('Project not found in this organization.', 'NOT_FOUND', 404);
    }

    await prisma.project.delete({
      where: { id },
    });

    // Update usage counters
    const currentProjectsCount = await prisma.project.count({ where: { organizationId } });
    await prisma.usageCounter.update({
      where: { organizationId },
      data: { projectsUsed: currentProjectsCount },
    }).catch(() => {});

    await createAuditLog({
      organizationId,
      actorId: req.user?.id,
      action: 'PROJECT_DELETED',
      targetType: 'Project',
      targetId: id,
      metadata: { name: existing.name },
    });

    res.status(200).json({ message: 'Project deleted successfully.' });
  } catch (error) {
    next(error);
  }
}
