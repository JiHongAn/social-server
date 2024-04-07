import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './libs/filters/http-exception.filter';
import * as _cluster from 'cluster';
const cluster = _cluster as unknown as _cluster.Cluster;
import { cpus } from 'os';

async function bootstrap() {
  if (cluster.isPrimary) {
    // CPU 코어 수만큼 워커 생성
    for (let i = 0; i < cpus().length; i++) {
      cluster.fork();
    }
  } else {
    // 서버 실행
    const app = await NestFactory.create(AppModule);

    // Pipes
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    // Filters
    app.useGlobalFilters(new HttpExceptionFilter());

    // cors 허용
    app.enableCors();

    // PORT
    const port = process.env.PORT || 3000;
    await app.listen(port);
  }
}
bootstrap();
