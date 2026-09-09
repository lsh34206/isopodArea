import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { DateUtils } from 'src/utils/dateUtils';
import { FileUtils } from 'src/utils/fileUtils';
import { AvatarUtils } from 'src/utils/avatarUtils';

const BOARDS = ['isopod', 'millipede'];
const TRANSACTION_TYPES = ['분양', '나눔'];

@Injectable()
export class MarketService {
    constructor(
        @InjectModel('market') private readonly marketModel: Model<any>,
        @InjectModel('users') private readonly usersModel: Model<any>,
    ) {}

    async getListings(board: string) {
        if (!BOARDS.includes(board)) {
            return { success: false, message: '존재하지 않는 게시판입니다.', listings: [] };
        }

        const listings = await this.marketModel
            .find({ type: board })
            .sort({ createdAt: -1 })
            .select('-description -likes -comments')
            .exec();

        return { success: true, listings: await AvatarUtils.attachAvatars(listings, this.usersModel, 'sellerId') };
    }

    async getListing(board: string, id: string, skipViewCount = false) {
        if (!BOARDS.includes(board) || !isValidObjectId(id)) {
            return { success: false, message: '존재하지 않는 분양글입니다.', listing: null };
        }

        const listing = skipViewCount
            ? await this.marketModel.findOne({ _id: id, type: board }).exec()
            : await this.marketModel
                  .findOneAndUpdate(
                      { _id: id, type: board },
                      { $inc: { view_count: 1 } },
                      { new: true },
                  )
                  .exec();

        if (!listing) {
            return { success: false, message: '존재하지 않는 분양글입니다.', listing: null };
        }
        return { success: true, listing };
    }

    async deleteListing(
        board: string,
        id: string,
        sessionUser: { _id: string; role?: string } | undefined,
    ) {
        if (!BOARDS.includes(board) || !isValidObjectId(id)) {
            return { success: false, message: '존재하지 않는 분양글입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }

        const listing = await this.marketModel.findOne({ _id: id, type: board }).exec();
        if (!listing) {
            return { success: false, message: '존재하지 않는 분양글입니다.' };
        }
        if (String(listing.sellerId) !== String(sessionUser._id) && sessionUser.role !== 'admin') {
            return { success: false, message: '본인이 작성한 분양글만 삭제할 수 있습니다.' };
        }

        await this.marketModel.deleteOne({ _id: id, type: board }).exec();
        await FileUtils.removeUploadedFiles(listing.imgsPath ?? []);

        return { success: true, message: '분양글이 삭제되었습니다.' };
    }

    private validateFields(body: {
        title?: string;
        transactionType?: string;
        price?: string | number;
        species?: string;
        subSpecies?: string;
        description?: string;
    }) {
        const title = (body.title ?? '').trim();
        const transactionType = (body.transactionType ?? '').trim();
        const species = (body.species ?? '').trim();
        const subSpecies = (body.subSpecies ?? '').trim();
        const description = (body.description ?? '').replace(/\r\n/g, '\n').trim();
        const price = Number(body.price);

        if (!title || !species || !subSpecies || !description) {
            return { error: '제목, 학명, 관용명, 설명을 모두 입력해 주세요.' };
        }
        if (!TRANSACTION_TYPES.includes(transactionType)) {
            return { error: '거래 유형을 선택해 주세요.' };
        }
        if (!Number.isFinite(price) || price < 0) {
            return { error: '가격을 올바르게 입력해 주세요.' };
        }

        return { title, transactionType, price, species, subSpecies, description };
    }

    async editListing(
        board: string,
        id: string,
        body: {
            title?: string;
            transactionType?: string;
            price?: string | number;
            species?: string;
            subSpecies?: string;
            description?: string;
            keepImages?: string | string[];
        },
        files: Array<{ filename: string }> | undefined,
        sessionUser: { _id: string; role?: string } | undefined,
    ) {
        if (!BOARDS.includes(board) || !isValidObjectId(id)) {
            return { success: false, message: '존재하지 않는 분양글입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }

        const listing = await this.marketModel.findOne({ _id: id, type: board }).exec();
        if (!listing) {
            return { success: false, message: '존재하지 않는 분양글입니다.' };
        }
        if (String(listing.sellerId) !== String(sessionUser._id) && sessionUser.role !== 'admin') {
            return { success: false, message: '본인이 작성한 분양글만 수정할 수 있습니다.' };
        }

        const fields = this.validateFields(body);
        if ('error' in fields) {
            return { success: false, message: fields.error };
        }

        const existingImages: string[] = listing.imgsPath ?? [];
        const keepImages = ([] as string[])
            .concat(body.keepImages ?? [])
            .filter((path) => existingImages.includes(path));
        const removedImages = existingImages.filter((path) => !keepImages.includes(path));
        const newImages = (files ?? []).map((file) => `/files/market/${file.filename}`);
        const imgsPath = [...keepImages, ...newImages].slice(0, 10);

        if (imgsPath.length === 0) {
            return { success: false, message: '사진을 1장 이상 남겨주세요.' };
        }

        const updated = await this.marketModel
            .findOneAndUpdate(
                { _id: id, type: board },
                { $set: { ...fields, imgsPath } },
                { new: true },
            )
            .exec();

        await FileUtils.removeUploadedFiles(removedImages);

        return { success: true, message: '분양글이 수정되었습니다.', listing: updated };
    }

    async createListing(
        board: string,
        body: {
            title?: string;
            transactionType?: string;
            price?: string | number;
            species?: string;
            subSpecies?: string;
            description?: string;
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

        const fields = this.validateFields(body);
        if ('error' in fields) {
            return { success: false, message: fields.error };
        }
        if (!files || files.length === 0) {
            return { success: false, message: '사진을 1장 이상 첨부해 주세요.' };
        }

        const imgsPath = files.map((file) => `/files/market/${file.filename}`);

        const listing = await this.marketModel.create({
            ...fields,
            type: board,
            sellerId: sessionUser._id,
            sellerName: sessionUser.name,
            imgsPath,
            createdAt: DateUtils.now_date(),
        });

        return { success: true, message: '분양글이 등록되었습니다.', listing };
    }

    async addComment(
        board: string,
        id: string,
        body: { content?: string; parentId?: string },
        sessionUser: { _id: string; name: string } | undefined,
    ) {
        if (!BOARDS.includes(board) || !isValidObjectId(id)) {
            return { success: false, message: '존재하지 않는 분양글입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }

        const content = (body.content ?? '').trim();
        if (!content) {
            return { success: false, message: '댓글 내용을 입력해 주세요.' };
        }

        let parentId: Types.ObjectId | null = null;
        if (body.parentId) {
            if (!isValidObjectId(body.parentId)) {
                return { success: false, message: '존재하지 않는 댓글입니다.' };
            }
            parentId = new Types.ObjectId(body.parentId);
            // comments가 스키마 없는 Array라 Mongoose가 _id를 자동 캐스팅하지 않으므로 직접 ObjectId로 비교
            const existing = await this.marketModel.findOne({ _id: id, type: board, 'comments._id': parentId }).exec();
            if (!existing) {
                return { success: false, message: '존재하지 않는 댓글입니다.' };
            }
        }

        const comment = {
            _id: new Types.ObjectId(),
            content,
            parentId,
            writerId: sessionUser._id,
            writerName: sessionUser.name,
            createdAt: DateUtils.now_date(),
        };

        const listing = await this.marketModel
            .findOneAndUpdate(
                { _id: id, type: board },
                { $push: { comments: comment }, $inc: { comment_count: 1 } },
                { new: true },
            )
            .exec();

        if (!listing) {
            return { success: false, message: '존재하지 않는 분양글입니다.' };
        }

        return { success: true, message: '댓글이 등록되었습니다.', comments: listing.comments };
    }

    async editComment(
        board: string,
        id: string,
        commentId: string,
        body: { content?: string },
        sessionUser: { _id: string } | undefined,
    ) {
        if (!BOARDS.includes(board) || !isValidObjectId(id) || !isValidObjectId(commentId)) {
            return { success: false, message: '존재하지 않는 댓글입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }

        const content = (body.content ?? '').trim();
        if (!content) {
            return { success: false, message: '댓글 내용을 입력해 주세요.' };
        }

        const listing = await this.marketModel.findOne({ _id: id, type: board }).exec();
        if (!listing) {
            return { success: false, message: '존재하지 않는 분양글입니다.' };
        }

        const target = (listing.comments ?? []).find((c: any) => String(c._id) === commentId);
        if (!target) {
            return { success: false, message: '존재하지 않는 댓글입니다.' };
        }
        if (String(target.writerId) !== String(sessionUser._id)) {
            return { success: false, message: '본인이 작성한 댓글만 수정할 수 있습니다.' };
        }

        const updated = await this.marketModel
            .findOneAndUpdate(
                { _id: id, type: board, 'comments._id': new Types.ObjectId(commentId) },
                { $set: { 'comments.$.content': content } },
                { new: true },
            )
            .exec();

        return { success: true, message: '댓글이 수정되었습니다.', comments: updated.comments };
    }

    async deleteComment(
        board: string,
        id: string,
        commentId: string,
        sessionUser: { _id: string; role?: string } | undefined,
    ) {
        if (!BOARDS.includes(board) || !isValidObjectId(id) || !isValidObjectId(commentId)) {
            return { success: false, message: '존재하지 않는 댓글입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }

        const listing = await this.marketModel.findOne({ _id: id, type: board }).exec();
        if (!listing) {
            return { success: false, message: '존재하지 않는 분양글입니다.' };
        }

        const target = (listing.comments ?? []).find((c: any) => String(c._id) === commentId);
        if (!target) {
            return { success: false, message: '존재하지 않는 댓글입니다.' };
        }
        if (String(target.writerId) !== String(sessionUser._id) && sessionUser.role !== 'admin') {
            return { success: false, message: '본인이 작성한 댓글만 삭제할 수 있습니다.' };
        }

        // 대댓글이 딸린 댓글을 지우면 그 대댓글들도 함께 정리
        const commentObjectId = new Types.ObjectId(commentId);
        const removedCount = (listing.comments ?? []).filter(
            (c: any) => String(c._id) === commentId || String(c.parentId) === commentId,
        ).length;

        const updated = await this.marketModel
            .findOneAndUpdate(
                { _id: id, type: board },
                {
                    $pull: { comments: { $or: [{ _id: commentObjectId }, { parentId: commentObjectId }] } },
                    $inc: { comment_count: -removedCount },
                },
                { new: true },
            )
            .exec();

        return { success: true, message: '댓글이 삭제되었습니다.', comments: updated.comments };
    }

    async toggleLike(board: string, id: string, sessionUser: { _id: string } | undefined) {
        if (!BOARDS.includes(board) || !isValidObjectId(id)) {
            return { success: false, message: '존재하지 않는 분양글입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }

        const userId = String(sessionUser._id);
        const existing = await this.marketModel.findOne({ _id: id, type: board }).exec();
        if (!existing) {
            return { success: false, message: '존재하지 않는 분양글입니다.' };
        }

        const alreadyLiked = (existing.likes ?? []).some((likeId: any) => String(likeId) === userId);

        const listing = await this.marketModel
            .findOneAndUpdate(
                { _id: id, type: board },
                alreadyLiked
                    ? { $pull: { likes: userId }, $inc: { like_count: -1 } }
                    : { $addToSet: { likes: userId }, $inc: { like_count: 1 } },
                { new: true },
            )
            .exec();

        return { success: true, liked: !alreadyLiked, like_count: listing.like_count };
    }
}
