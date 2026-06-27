import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProceduresModule } from './procedures/procedures.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ProceduresModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
