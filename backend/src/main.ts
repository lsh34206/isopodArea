import { NestFactory } from '@nestjs/core';
import { appModule } from './app.module';
import cookieParser from "cookie-parser";
import path from "path";
import session from 'express-session';
import { SessionIoAdapter } from './auction/session-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(appModule);

  app.use(cookieParser());

  app.enableCors({
      origin: ["http://localhost:5173"],
      credentials:true
    });

    const sessionMiddleware = session({
      secret: 'isopodArea',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7일간 로그인 유지
      },
    });

    app.use(sessionMiddleware);

    // 실시간 경매 소켓도 같은 로그인 세션(쿠키)을 공유하도록 연결
    app.useWebSocketAdapter(new SessionIoAdapter(app, sessionMiddleware));

  await app.listen(8080);
}
bootstrap();
