import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { DateUtils } from 'src/utils/dateUtils';
import { FileUtils } from 'src/utils/fileUtils';
import { AvatarUtils } from 'src/utils/avatarUtils';
import { ChatService } from '../chat/chat.service';

const BOARDS = ['isopod', 'millipede'];
const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 60 * 24 * 7; // 최대 7일
const MIN_BID_STEP = 100; // 최소 입찰 증가 단위 (원)

@Injectable()
export class AuctionService {
    constructor(
        @InjectModel('Auction') private readonly auctionModel: Model<any>,
        @InjectModel('AuctionBid') private readonly auctionBidModel: Model<any>,
        @InjectModel('AuctionChat') private readonly auctionChatModel: Model<any>,
        @InjectModel('AuctionResult') private readonly auctionResultModel: Model<any>,
        @InjectModel('users') private readonly usersModel: Model<any>,
        private readonly chatService: ChatService,
    ) {}

    async getAuctions(board: string) {
        if (!BOARDS.includes(board)) {
            return { success: false, message: '존재하지 않는 게시판입니다.', auctions: [] };
        }

        const auctions = await this.auctionModel
            .find({ type: board })
            .sort({ status: -1, endTime: 1 })
            .select('-description')
            .exec();

        return { success: true, auctions: await AvatarUtils.attachAvatars(auctions, this.usersModel, 'sellerId') };
    }

    async getAuction(board: string, id: string) {
        if (!BOARDS.includes(board) || !isValidObjectId(id)) {
            return { success: false, message: '존재하지 않는 경매입니다.', auction: null, activity: [] };
        }

        const auction = await this.auctionModel.findOne({ _id: id, type: board }).exec();
        if (!auction) {
            return { success: false, message: '존재하지 않는 경매입니다.', auction: null, activity: [] };
        }

        const recentActivity = await this.auctionChatModel
            .find({ auctionId: auction._id })
            .sort({ createdAt: -1 })
            .limit(50)
            .exec();

        return { success: true, auction, activity: recentActivity.reverse() };
    }

    async createAuction(
        board: string,
        body: {
            title?: string;
            species?: string;
            subSpecies?: string;
            description?: string;
            startBid?: string | number;
            durationMinutes?: string | number;
        },
        files: Array<{ filename: string }> | undefined,
        sessionUser: { _id: string; name: string } | undefined,
    ) {
        if (!BOARDS.includes(board)) {
            return { success: false, message: '존재하지 않는 게시판입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }

        const title = (body.title ?? '').trim();
        const species = (body.species ?? '').trim();
        const subSpecies = (body.subSpecies ?? '').trim();
        const description = (body.description ?? '').replace(/\r\n/g, '\n').trim();
        const startBid = Number(body.startBid);
        const durationMinutes = Number(body.durationMinutes);

        if (!title || !species || !subSpecies || !description) {
            return { success: false, message: '제목, 학명, 관용명, 설명을 모두 입력해 주세요.' };
        }
        if (!Number.isFinite(startBid) || startBid <= 0) {
            return { success: false, message: '시작가를 올바르게 입력해 주세요.' };
        }
        if (
            !Number.isFinite(durationMinutes) ||
            durationMinutes < MIN_DURATION_MINUTES ||
            durationMinutes > MAX_DURATION_MINUTES
        ) {
            return { success: false, message: `경매 시간은 ${MIN_DURATION_MINUTES}분~${MAX_DURATION_MINUTES}분 사이로 입력해 주세요.` };
        }
        if (!files || files.length === 0) {
            return { success: false, message: '사진을 1장 이상 첨부해 주세요.' };
        }

        const imgsPath = files.map((file) => `/files/auction/${file.filename}`);

        const auction = await this.auctionModel.create({
            title,
            type: board,
            species,
            subSpecies,
            description,
            sellerId: sessionUser._id,
            sellerName: sessionUser.name,
            imgsPath,
            startBid,
            endTime: Date.now() + durationMinutes * 60_000,
            createdAt: DateUtils.now_date(),
        });

        return { success: true, message: '경매가 등록되었습니다.', auction };
    }

    async deleteAuction(board: string, id: string, sessionUser: { _id: string; role?: string } | undefined) {
        if (!BOARDS.includes(board) || !isValidObjectId(id)) {
            return { success: false, message: '존재하지 않는 경매입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }

        const auction = await this.auctionModel.findOne({ _id: id, type: board }).exec();
        if (!auction) {
            return { success: false, message: '존재하지 않는 경매입니다.' };
        }
        if (String(auction.sellerId) !== String(sessionUser._id) && sessionUser.role !== 'admin') {
            return { success: false, message: '본인이 등록한 경매만 삭제할 수 있습니다.' };
        }
        if (auction.highBidderId && sessionUser.role !== 'admin') {
            return { success: false, message: '입찰이 있은 후에는 삭제할 수 없습니다.' };
        }

        await this.auctionModel.deleteOne({ _id: id, type: board }).exec();
        await this.auctionBidModel.deleteMany({ auctionId: auction._id }).exec();
        await this.auctionChatModel.deleteMany({ auctionId: auction._id }).exec();
        await this.auctionResultModel.deleteMany({ auctionId: auction._id }).exec();
        await FileUtils.removeUploadedFiles(auction.imgsPath ?? []);

        return { success: true, message: '경매가 삭제되었습니다.' };
    }

    // 방 입장 시 초기 상태로 클라이언트에 내려줄 최근 활동 로그
    async getRoomState(auctionId: string) {
        if (!isValidObjectId(auctionId)) return null;
        const auction = await this.auctionModel.findById(auctionId).exec();
        if (!auction) return null;

        const recentActivity = await this.auctionChatModel
            .find({ auctionId: auction._id })
            .sort({ createdAt: -1 })
            .limit(50)
            .exec();

        return { auction, activity: recentActivity.reverse() };
    }

    async placeBid(
        auctionId: string,
        sessionUser: { _id: string; name: string } | undefined,
        bidPrice: number,
    ) {
        if (!isValidObjectId(auctionId)) {
            return { success: false, message: '존재하지 않는 경매입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }
        if (!Number.isFinite(bidPrice) || !Number.isInteger(bidPrice) || bidPrice <= 0) {
            return { success: false, message: '입찰가를 올바르게 입력해 주세요.' };
        }

        const auction = await this.auctionModel.findById(auctionId).exec();
        if (!auction) {
            return { success: false, message: '존재하지 않는 경매입니다.' };
        }
        if (!auction.status || auction.endTime <= Date.now()) {
            return { success: false, message: '종료된 경매입니다.' };
        }
        if (String(auction.sellerId) === String(sessionUser._id)) {
            return { success: false, message: '본인이 등록한 경매에는 입찰할 수 없습니다.' };
        }

        const minBid = auction.highBidderId ? auction.highBid + MIN_BID_STEP : auction.startBid;
        if (bidPrice < minBid) {
            return { success: false, message: `최소 ${minBid.toLocaleString()}원 이상 입찰해 주세요.` };
        }

        const roomId = String(auction._id);
        const updated = await this.auctionModel
            .findOneAndUpdate(
                { _id: auctionId, highBid: auction.highBid },
                {
                    $set: {
                        highBid: bidPrice,
                        highBidderId: sessionUser._id,
                        highBidderName: sessionUser.name,
                    },
                },
                { new: true },
            )
            .exec();

        if (!updated) {
            // 동시에 다른 입찰이 먼저 반영된 경우
            return { success: false, message: '이미 다른 입찰이 접수되었습니다. 다시 시도해 주세요.' };
        }

        await this.auctionBidModel.create({
            auctionId: updated._id,
            roomId,
            bidderId: sessionUser._id,
            bidderName: sessionUser.name,
            bidPrice,
            createdAt: DateUtils.now_date(),
        });

        const chat = await this.auctionChatModel.create({
            auctionId: updated._id,
            roomId,
            senderId: sessionUser._id,
            senderName: sessionUser.name,
            message: `${sessionUser.name}님이 ${bidPrice.toLocaleString()}원에 입찰했습니다.`,
            messageType: 'bid',
            bidPrice,
            createdAt: DateUtils.now_date(),
        });

        return { success: true, auction: updated, chat };
    }

    async sendChat(
        auctionId: string,
        sessionUser: { _id: string; name: string } | undefined,
        message: string,
    ) {
        if (!isValidObjectId(auctionId)) {
            return { success: false, message: '존재하지 않는 경매입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }

        const content = (message ?? '').trim();
        if (!content) {
            return { success: false, message: '메시지를 입력해 주세요.' };
        }

        const auction = await this.auctionModel.findById(auctionId).exec();
        if (!auction) {
            return { success: false, message: '존재하지 않는 경매입니다.' };
        }

        const chat = await this.auctionChatModel.create({
            auctionId: auction._id,
            roomId: String(auction._id),
            senderId: sessionUser._id,
            senderName: sessionUser.name,
            message: content,
            messageType: 'chat',
            createdAt: DateUtils.now_date(),
        });

        return { success: true, chat };
    }

    // 종료 시각이 지났지만 아직 마감 처리되지 않은 경매를 정리하고, 새로 마감된 목록을 반환한다.
    // 소켓 브로드캐스트는 게이트웨이가 담당한다.
    async finalizeExpiredAuctions() {
        const expired = await this.auctionModel
            .find({ status: true, endTime: { $lte: Date.now() } })
            .exec();

        const finalized: { auction: any; result: any; chat: any; mailboxRoom: any }[] = [];

        for (const auction of expired) {
            const updated = await this.auctionModel
                .findOneAndUpdate({ _id: auction._id, status: true }, { $set: { status: false } }, { new: true })
                .exec();
            if (!updated) continue; // 이미 다른 사이클에서 처리됨

            const result = await this.auctionResultModel.create({
                auctionId: updated._id,
                title: updated.title,
                type: updated.type,
                species: updated.species,
                subSpecies: updated.subSpecies,
                winnerId: updated.highBidderId ?? null,
                winnerName: updated.highBidderName ?? '',
                finalPrice: updated.highBidderId ? updated.highBid : 0,
                sellerId: updated.sellerId,
                endedAt: DateUtils.now_date(),
            });

            const chat = await this.auctionChatModel.create({
                auctionId: updated._id,
                roomId: String(updated._id),
                senderId: updated.sellerId,
                senderName: 'system',
                message: updated.highBidderId
                    ? `경매가 종료되었습니다. 낙찰자: ${updated.highBidderName} (${updated.highBid.toLocaleString()}원)`
                    : '경매가 종료되었습니다. 입찰자가 없어 유찰되었습니다.',
                messageType: 'system',
                createdAt: DateUtils.now_date(),
            });

            // 낙찰자가 있으면 주최자-낙찰자 채팅방을 만들고 우편함에 낙찰 안내를 남긴다.
            const mailboxResult = updated.highBidderId
                ? await this.chatService.createAuctionResultRoom({
                      auctionId: updated._id,
                      title: updated.title,
                      sellerId: updated.sellerId,
                      winnerId: updated.highBidderId,
                      winnerName: updated.highBidderName,
                      finalPrice: updated.highBid,
                  })
                : null;

            finalized.push({ auction: updated, result, chat, mailboxRoom: mailboxResult?.room ?? null });
        }

        return finalized;
    }
}
