import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

// 소켓 연결에도 로그인 세션(쿠키)을 그대로 쓸 수 있도록 express-session 미들웨어를 엔진에 붙여준다.
export class SessionIoAdapter extends IoAdapter {
    constructor(
        app: any,
        private readonly sessionMiddleware: (req: any, res: any, next: any) => void,
    ) {
        super(app);
    }

    createIOServer(port: number, options?: ServerOptions): any {
        const server = super.createIOServer(port, {
            ...options,
            cors: {
                origin: ['http://localhost:5173'],
                credentials: true,
            },
        });
        server.engine.use((req: any, res: any, next: any) => {
            this.sessionMiddleware(req, res, next);
        });
        return server;
    }
}
