import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

export function validate(schema: AnyZodObject) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      // Assign parsed values back to request
      if (parsed.body) req.body = parsed.body;
      if (parsed.query) req.query = parsed.query as any;
      if (parsed.params) req.params = parsed.params as any;
      next();
    } catch (error) {
      next(error);
    }
  };
}
