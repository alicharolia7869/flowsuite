import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../utils/audit';

export async function listTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId, role } = req.tenant!;
    const userId = req.user!.id;
    const { projectId, status, assigneeId } = req.query as {
      projectId?: string;
      status?: string;
      assigneeId?: string;
    };

    const where: any = { organizationId };

    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;

    // Role-based visibility: MEMBER can only see tasks assigned to them
    if (role === 'MEMBER') {
      where.assigneeId = userId;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ tasks });
  } catch (error) {
    next(error);
  }
}

export async function getTaskById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId, role } = req.tenant!;
    const { id } = req.params;
    const userId = req.user!.id;

    const task = await prisma.task.findFirst({
      where: { id, organizationId },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (!task) {
      throw new AppError('Task not found in this organization.', 'NOT_FOUND', 404);
    }

    if (role === 'MEMBER' && task.assigneeId !== userId) {
      throw new AppError('Permission denied. You can only view tasks assigned to you.', 'FORBIDDEN', 403);
    }

    res.status(200).json({ task });
  } catch (error) {
    next(error);
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.tenant!;
    const { projectId, title, description, assigneeId, status, dueDate } = req.body;

    // Verify project belongs to organization
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw new AppError('Selected project does not belong to your organization.', 'BAD_REQUEST', 400);
    }

    // Verify assignee belongs to organization if specified
    if (assigneeId) {
      const membership = await prisma.membership.findFirst({
        where: { userId: assigneeId, organizationId },
      });
      if (!membership) {
        throw new AppError('Assigned user is not a member of this organization.', 'BAD_REQUEST', 400);
      }
    }

    const task = await prisma.task.create({
      data: {
        organizationId,
        projectId,
        title,
        description: description || null,
        assigneeId: assigneeId || null,
        status: status || 'TODO',
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    await createAuditLog({
      organizationId,
      actorId: req.user?.id,
      action: 'TASK_CREATED',
      targetType: 'Task',
      targetId: task.id,
      metadata: { title: task.title, projectId: task.projectId },
    });

    res.status(201).json({
      message: 'Task created successfully.',
      task,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId, role } = req.tenant!;
    const { id } = req.params;
    const userId = req.user!.id;
    const { title, description, assigneeId, status, dueDate } = req.body;

    const existingTask = await prisma.task.findFirst({
      where: { id, organizationId },
    });

    if (!existingTask) {
      throw new AppError('Task not found in this organization.', 'NOT_FOUND', 404);
    }

    // Server-side RBAC restriction for MEMBER
    if (role === 'MEMBER') {
      if (existingTask.assigneeId !== userId) {
        throw new AppError('Permission denied. You can only update tasks assigned to yourself.', 'FORBIDDEN', 403);
      }

      // Member can ONLY update status
      if (title !== undefined || description !== undefined || assigneeId !== undefined || dueDate !== undefined) {
        throw new AppError('Members are only authorized to change their assigned task status.', 'FORBIDDEN', 403);
      }
    }

    // Verify assignee membership if changed
    if (assigneeId && assigneeId !== existingTask.assigneeId) {
      const membership = await prisma.membership.findFirst({
        where: { userId: assigneeId, organizationId },
      });
      if (!membership) {
        throw new AppError('Assigned user is not a member of this organization.', 'BAD_REQUEST', 400);
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(status !== undefined && { status }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    await createAuditLog({
      organizationId,
      actorId: req.user?.id,
      action: 'TASK_UPDATED',
      targetType: 'Task',
      targetId: id,
      metadata: { changes: req.body },
    });

    res.status(200).json({
      message: 'Task updated successfully.',
      task: updatedTask,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.tenant!;
    const { id } = req.params;

    const existingTask = await prisma.task.findFirst({
      where: { id, organizationId },
    });

    if (!existingTask) {
      throw new AppError('Task not found in this organization.', 'NOT_FOUND', 404);
    }

    await prisma.task.delete({
      where: { id },
    });

    await createAuditLog({
      organizationId,
      actorId: req.user?.id,
      action: 'TASK_DELETED',
      targetType: 'Task',
      targetId: id,
      metadata: { title: existingTask.title },
    });

    res.status(200).json({ message: 'Task deleted successfully.' });
  } catch (error) {
    next(error);
  }
}
