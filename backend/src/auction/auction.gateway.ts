import {
    ConnectedSocket,
    MessageBody,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuctionService } from './auction.service';

interface SessionUser {
    _id: string;
    name: string;
    role?: string;
}

@WebSocketGateway({
    cors: {
        origin: ['http://localhost:5173'],
        credentials: true,
    },
})
export class AuctionGateway implements OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(private readonly auctionService: AuctionService) {}

    private getSessionUser(client: Socket): SessionUser | undefined {
        return (client.request as any)?.session?.user;
    }

    // 같은 사람이 여러 탭으로 접속해도 한 명으로 묶어서 보여준다. (비로그인 방문자는 소켓별로 따로 표시)
    private async getViewers(auctionId: string) {
        const sockets = await this.server.in(auctionId).fetchSockets();
        const map = new Map<string, { id: string; name: string; isGuest: boolean }>();
        for (const s of sockets) {
            const key = (s.data as any)?.viewerId ?? s.id;
            if (!map.has(key)) {
                map.set(key, {
                    id: key,
                    name: (s.data as any)?.viewerName ?? '익명 방문자',
                    isGuest: !(s.data as any)?.viewerId,
                });
            }
        }
        return [...map.values()];
    }

    private async broadcastViewers(auctionId: string) {
        const viewers = await this.getViewers(auctionId);
        this.server.to(auctionId).emit('viewerList', { viewers, count: viewers.length });
    }

    @SubscribeMessage('joinRoom')
    async handleJoinRoom(@MessageBody() data: { auctionId: string }, @ConnectedSocket() client: Socket) {
        const state = await this.auctionService.getRoomState(data?.auctionId);
        if (!state) {
            client.emit('error', { message: '존재하지 않는 경매입니다.' });
            return;
        }
        const sessionUser = this.getSessionUser(client);
        client.join(data.auctionId);
        client.data.auctionId = data.auctionId;
        client.data.viewerId = sessionUser?._id;
        client.data.viewerName = sessionUser?.name ?? '익명 방문자';
        client.emit('roomState', state);
        await this.broadcastViewers(data.auctionId);
    }

    @SubscribeMessage('leaveRoom')
    async handleLeaveRoom(@MessageBody() data: { auctionId: string }, @ConnectedSocket() client: Socket) {
        client.leave(data.auctionId);
        if (client.data.auctionId === data.auctionId) {
            client.data.auctionId = undefined;
        }
        await this.broadcastViewers(data.auctionId);
    }

    // 접속자 목록 방송을 위해 소켓이 어떤 경매방에 있었는지는 join 시점에 client.data에 기록해 둔다.
    // (disconnect 처리 시점엔 socket.io가 이미 모든 room에서 자동으로 내보낸 뒤라 client.rooms로는 알 수 없다.)
    async handleDisconnect(client: Socket) {
        const auctionId = client.data?.auctionId;
        if (auctionId) {
            await this.broadcastViewers(auctionId);
        }
    }

    @SubscribeMessage('placeBid')
    async handlePlaceBid(
        @MessageBody() data: { auctionId: string; bidPrice: number },
        @ConnectedSocket() client: Socket,
    ) {
        const sessionUser = this.getSessionUser(client);
        const result = await this.auctionService.placeBid(data?.auctionId, sessionUser, Number(data?.bidPrice));
        if (!result.success) {
            client.emit('bidRejected', { message: result.message });
            return;
        }
        this.server.to(data.auctionId).emit('newBid', { auction: result.auction, chat: result.chat });
    }

    @SubscribeMessage('sendChat')
    async handleSendChat(
        @MessageBody() data: { auctionId: string; message: string },
        @ConnectedSocket() client: Socket,
    ) {
        const sessionUser = this.getSessionUser(client);
        const result = await this.auctionService.sendChat(data?.auctionId, sessionUser, data?.message);
        if (!result.success) {
            client.emit('chatRejected', { message: result.message });
            return;
        }
        this.server.to(data.auctionId).emit('newChat', { chat: result.chat });
    }

    // 종료 시각이 지난 경매를 주기적으로 확인해 마감 처리하고, 해당 방에 결과를 알린다.
    @Cron(CronExpression.EVERY_10_SECONDS)
    async handleFinalizeExpired() {
        const finalized = await this.auctionService.finalizeExpiredAuctions();
        for (const { auction, result, chat, mailboxRoom } of finalized) {
            this.server.to(String(auction._id)).emit('auctionEnded', { auction, result, chat });
            if (mailboxRoom) {
                this.server.to(`user:${auction.sellerId}`).emit('chatMailboxUpdate', { roomId: String(mailboxRoom._id) });
                this.server.to(`user:${auction.highBidderId}`).emit('chatMailboxUpdate', { roomId: String(mailboxRoom._id) });
            }
        }
    }
}
