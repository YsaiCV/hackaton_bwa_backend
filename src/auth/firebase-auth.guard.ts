import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';
import { UsersService } from '../users/users.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn('No se encontró el token Bearer en el header Authorization');
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      // Validate Firebase token
      const decodedToken = await getAuth().verifyIdToken(token);
      
      // Find or create the user in our database
      const user = await this.usersService.findOrCreateUser(
        decodedToken.uid,
        decodedToken.email || '',
        decodedToken.name || '',
      );

      // Attach user to request object
      request.user = user;
      
      return true;
    } catch (error) {
      this.logger.error(`Error verificando token de Firebase: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
