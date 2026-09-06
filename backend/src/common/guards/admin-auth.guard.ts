import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * Guard для /admin-api. Токен принимается в заголовке `x-admin-token`
 * или в `Authorization: Bearer <token>`.
 *
 * Если ADMIN_TOKEN не задан в окружении (локальная разработка) — доступ
 * открыт, чтобы не блокировать dev-процесс. В проде (docker-compose)
 * секрет задан, поэтому админка закрыта от анонимов.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.ADMIN_TOKEN;
    if (!secret) return true;

    // @types/express не подключён — описываем нужную часть request локально.
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const header = request.headers['x-admin-token'];
    const headerValue = Array.isArray(header) ? header[0] : header;

    const auth = request.headers.authorization;
    const authValue = Array.isArray(auth) ? auth[0] : auth;
    const bearer = authValue?.startsWith('Bearer ') ? authValue.slice(7) : undefined;

    const provided = headerValue ?? bearer;
    if (provided && provided === secret) return true;

    throw new UnauthorizedException('Invalid admin token');
  }
}
