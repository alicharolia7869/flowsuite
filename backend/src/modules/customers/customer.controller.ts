import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../utils/audit';

export async function listCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.tenant!;
    const { search, projectId } = req.query as { search?: string; projectId?: string };

    const where: any = { organizationId };

    if (projectId) {
      where.projectId = projectId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ customers });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.tenant!;
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: { id, organizationId },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (!customer) {
      throw new AppError('Customer not found in this organization.', 'NOT_FOUND', 404);
    }

    res.status(200).json({ customer });
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.tenant!;
    const { name, email, phone, company, notes, projectId } = req.body;

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, organizationId },
      });
      if (!project) {
        throw new AppError('Linked project does not belong to your organization.', 'BAD_REQUEST', 400);
      }
    }

    const customer = await prisma.customer.create({
      data: {
        organizationId,
        name,
        email,
        phone: phone || null,
        company: company || null,
        notes: notes || null,
        projectId: projectId || null,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    await createAuditLog({
      organizationId,
      actorId: req.user?.id,
      action: 'CUSTOMER_CREATED',
      targetType: 'Customer',
      targetId: customer.id,
      metadata: { name: customer.name, email: customer.email, company: customer.company },
    });

    res.status(201).json({
      message: 'Customer created successfully.',
      customer,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.tenant!;
    const { id } = req.params;
    const { name, email, phone, company, notes, projectId } = req.body;

    const existingCustomer = await prisma.customer.findFirst({
      where: { id, organizationId },
    });

    if (!existingCustomer) {
      throw new AppError('Customer not found in this organization.', 'NOT_FOUND', 404);
    }

    if (projectId && projectId !== existingCustomer.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, organizationId },
      });
      if (!project) {
        throw new AppError('Linked project does not belong to your organization.', 'BAD_REQUEST', 400);
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(company !== undefined && { company }),
        ...(notes !== undefined && { notes }),
        ...(projectId !== undefined && { projectId }),
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    await createAuditLog({
      organizationId,
      actorId: req.user?.id,
      action: 'CUSTOMER_UPDATED',
      targetType: 'Customer',
      targetId: id,
      metadata: { changes: req.body },
    });

    res.status(200).json({
      message: 'Customer updated successfully.',
      customer: updatedCustomer,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.tenant!;
    const { id } = req.params;

    const existingCustomer = await prisma.customer.findFirst({
      where: { id, organizationId },
    });

    if (!existingCustomer) {
      throw new AppError('Customer not found in this organization.', 'NOT_FOUND', 404);
    }

    await prisma.customer.delete({
      where: { id },
    });

    await createAuditLog({
      organizationId,
      actorId: req.user?.id,
      action: 'CUSTOMER_DELETED',
      targetType: 'Customer',
      targetId: id,
      metadata: { name: existingCustomer.name },
    });

    res.status(200).json({ message: 'Customer deleted successfully.' });
  } catch (error) {
    next(error);
  }
}
