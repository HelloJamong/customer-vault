import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class SessionActivityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap(() => {
        if (request.user?.sessionExpiresAt) {
          response.setHeader('X-Session-Expires-At', request.user.sessionExpiresAt);
          response.setHeader(
            'X-Session-Warning-Enabled',
            String(request.user.sessionTimeoutWarningEnabled ?? true),
          );
        }
      }),
    );
  }
}
