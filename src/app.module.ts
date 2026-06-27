import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProceduresModule } from './procedures/procedures.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ProceduresModule, DocumentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
