import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { UsersModule } from '../users/users.module';
import { FirebaseAuthGuard } from './firebase-auth.guard';

@Module({
  imports: [UsersModule],
  providers: [FirebaseAuthGuard],
  exports: [FirebaseAuthGuard, UsersModule],
})
export class AuthModule implements OnModuleInit {
  private readonly logger = new Logger(AuthModule.name);

  onModuleInit() {
    // Initialize Firebase Admin SDK if not already initialized
    if (!getApps().length) {
      this.logger.log('Inicializando Firebase Admin SDK...');
      try {
        // En producción, usa credenciales o la cuenta de servicio por defecto (applicationDefault).
        // Si tienes el archivo serviceAccountKey.json, descomenta y usa credential.cert()

        initializeApp({
          credential: applicationDefault(),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });

        this.logger.log('Firebase Admin SDK inicializado exitosamente.');
      } catch (error) {
        this.logger.error(`Error inicializando Firebase Admin SDK: ${(error as Error).message}`);
        // Considera lanzar el error si tu app NO debe iniciar sin auth: throw error;
      }
    }
  }
}
