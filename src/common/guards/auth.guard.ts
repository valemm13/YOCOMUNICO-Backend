import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, StaffRole } from '../decorators/roles.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<StaffRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { id?: string; role?: StaffRole; shift?: string };
    }>();

    const authHeader = request.headers['authorization'];
    const staffRoleHeader = request.headers['x-staff-role'] as
      StaffRole | undefined;
    const staffIdHeader = request.headers['x-staff-id'];

    if (!authHeader && !staffRoleHeader) {
      throw new UnauthorizedException(
        'Se requiere identificación del personal médico en turno',
      );
    }

    let role: StaffRole = staffRoleHeader || StaffRole.DOCTOR;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      try {
        const decoded = JSON.parse(
          Buffer.from(token, 'base64').toString('utf8'),
        ) as { id?: string; role?: StaffRole; shift?: string };
        if (decoded.role) {
          role = decoded.role;
        }
        request.user = decoded;
      } catch {
        request.user = { id: staffIdHeader, role };
      }
    } else {
      request.user = { id: staffIdHeader, role };
    }

    return requiredRoles.includes(role);
  }
}
