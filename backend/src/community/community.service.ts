import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { DateUtils } from 'src/utils/dateUtils';
import { FileUtils } from 'src/utils/fileUtils';
import { AvatarUtils } from 'src/utils/avatarUtils';

// board = 스키마의 type 필드 값 (등각류/배각류)
const BOARDS = ['isopod', 'millipede'];

@Injectable()
export class CommunityService {
    private readonly models: Record<string, Model<any>>;

    constructor(
        @InjectModel('communityFree') freeModel: Model<any>,
        @InjectModel('communityLibrary') libraryModel: Model<any>,
        @InjectModel('communityNotice') noticeModel: Model<any>,
        @InjectModel('communityQuestion') questionModel: Model<any>,
        @InjectModel('users') private readonly usersModel: Model<any>,
    ) {
        this.models = {
            free: freeModel,
            library: libraryModel,
            notice: noticeModel,
            question: questionModel,
        };
    }

    async getPosts(board: string, type: string) {
        const model = this.models[type];
        if (!model || !BOARDS.includes(board)) {
            return { success: false, message: '존재하지 않는 게시판입니다.', posts: [] };
        }

        const posts = await model
            .find({ type: board })
            .sort({ createdAt: -1 })
            .select('-content -likes -comments')
            .exec();

        return { success: true, posts: await AvatarUtils.attachAvatars(posts, this.usersModel) };
    }

    async getPost(board: string, type: string, id: string, skipViewCount = false) {
        const model = this.models[type];
        if (!model || !BOARDS.includes(board) || !isValidObjectId(id)) {
            return { success: false, message: '존재하지 않는 게시글입니다.', post: null };
        }

        const post = skipViewCount
            ? await model.findOne({ _id: id, type: board }).exec()
            : await model
                  .findOneAndUpdate(
                      { _id: id, type: board },
                      { $inc: { view_count: 1 } },
                      { new: true },
                  )
                  .exec();

        if (!post) {
            return { success: false, message: '존재하지 않는 게시글입니다.', post: null };
        }
        return { success: true, post };
    }

    async deletePost(
        board: string,
        type: string,
        id: string,
        sessionUser: { _id: string; role?: string } | undefined,
    ) {
        const model = this.models[type];
        if (!model || !BOARDS.includes(board) || !isValidObjectId(id)) {
            return { success: false, message: '존재하지 않는 게시글입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }

        const post = await model.findOne({ _id: id, type: board }).exec();
        if (!post) {
            return { success: false, message: '존재하지 않는 게시글입니다.' };
        }
        if (String(post.uploaderId) !== String(sessionUser._id) && sessionUser.role !== 'admin') {
            return { success: false, message: '본인이 작성한 게시글만 삭제할 수 있습니다.' };
        }

        await model.deleteOne({ _id: id, type: board }).exec();
        await FileUtils.removeUploadedFiles(post.imgsPath ?? []);

        return { success: true, message: '게시글이 삭제되었습니다.' };
    }

    async editPost(
        board: string,
        type: string,
        id: string,
        body: { title?: string; content?: string; keepImages?: string | string[] },
        files: Array<{ filename: string }> | undefined,
        sessionUser: { _id: string; role?: string } | undefined,
    ) {
        const model = this.models[type];
        if (!model || !BOARDS.includes(board) || !isValidObjectId(id)) {
            return { success: false, message: '존재하지 않는 게시글입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }

        const post = await model.findOne({ _id: id, type: board }).exec();
        if (!post) {
            return { success: false, message: '존재하지 않는 게시글입니다.' };
        }
        if (String(post.uploaderId) !== String(sessionUser._id) && sessionUser.role !== 'admin') {
            return { success: false, message: '본인이 작성한 게시글만 수정할 수 있습니다.' };
        }

        const title = (body.title ?? '').trim();
        const content = (body.content ?? '').trim();
        if (!title || !content) {
            return { success: false, message: '제목과 내용을 입력해 주세요.' };
        }

        const existingImages: string[] = post.imgsPath ?? [];
        const keepImages = ([] as string[])
            .concat(body.keepImages ?? [])
            .filter((path) => existingImages.includes(path));
        const removedImages = existingImages.filter((path) => !keepImages.includes(path));
        const newImages = (files ?? []).map((file) => `/files/community/${file.filename}`);
        const imgsPath = [...keepImages, ...newImages].slice(0, 10);

        const updated = await model
            .findOneAndUpdate(
                { _id: id, type: board },
                { $set: { title, content, imgsPath } },
                { new: true },
            )
            .exec();

        await FileUtils.removeUploadedFiles(removedImages);

        return { success: true, message: '게시글이 수정되었습니다.', post: updated };
    }

    async createPost(
        board: string,
        type: string,
        body: { title?: string; content?: string },
        files: Array<{ filename: string }> | undefined,
        sessionUser: { _id: string; name: string; role: string } | undefined,
    ) {
        const model = this.models[type];
        if (!model || !BOARDS.includes(board)) {
            return { success: false, message: '존재하지 않는 게시판입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }
        if (type === 'notice' && sessionUser.role !== 'admin') {
            return { success: false, message: '공지는 관리자만 작성할 수 있습니다.' };
        }

        const title = (body.title ?? '').trim();
        const content = (body.content ?? '').trim();
        if (!title || !content) {
            return { success: false, message: '제목과 내용을 입력해 주세요.' };
        }

        const imgsPath = (files ?? []).map((file) => `/files/community/${file.filename}`);

        const post = await model.create({
            title,
            content,
            type: board,
            uploaderId: sessionUser._id,
            uploaderName: sessionUser.name,
            imgsPath,
            createdAt: DateUtils.now_date(),
        });

        return { success: true, message: '게시글이 등록되었습니다.', post };
    }

    async addComment(
        board: string,
        type: string,
        id: string,
        body: { content?: string; parentId?: string },
        sessionUser: { _id: string; name: string } | undefined,
    ) {
        const model = this.models[type];
        if (!model || !BOARDS.includes(board) || !isValidObjectId(id)) {
            return { success: false, message: '존재하지 않는 게시글입니다.' };
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
            const post = await model.findOne({ _id: id, type: board, 'comments._id': parentId }).exec();
            if (!post) {
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

        const post = await model
            .findOneAndUpdate(
                { _id: id, type: board },
                { $push: { comments: comment }, $inc: { comment_count: 1 } },
                { new: true },
            )
            .exec();

        if (!post) {
            return { success: false, message: '존재하지 않는 게시글입니다.' };
        }

        return { success: true, message: '댓글이 등록되었습니다.', comments: post.comments };
    }

    async editComment(
        board: string,
        type: string,
        id: string,
        commentId: string,
        body: { content?: string },
        sessionUser: { _id: string } | undefined,
    ) {
        const model = this.models[type];
        if (!model || !BOARDS.includes(board) || !isValidObjectId(id) || !isValidObjectId(commentId)) {
            return { success: false, message: '존재하지 않는 댓글입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }

        const content = (body.content ?? '').trim();
        if (!content) {
            return { success: false, message: '댓글 내용을 입력해 주세요.' };
        }

        const post = await model.findOne({ _id: id, type: board }).exec();
        if (!post) {
            return { success: false, message: '존재하지 않는 게시글입니다.' };
        }

        const target = (post.comments ?? []).find((c: any) => String(c._id) === commentId);
        if (!target) {
            return { success: false, message: '존재하지 않는 댓글입니다.' };
        }
        if (String(target.writerId) !== String(sessionUser._id)) {
            return { success: false, message: '본인이 작성한 댓글만 수정할 수 있습니다.' };
        }

        const updated = await model
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
        type: string,
        id: string,
        commentId: string,
        sessionUser: { _id: string; role?: string } | undefined,
    ) {
        const model = this.models[type];
        if (!model || !BOARDS.includes(board) || !isValidObjectId(id) || !isValidObjectId(commentId)) {
            return { success: false, message: '존재하지 않는 댓글입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }

        const post = await model.findOne({ _id: id, type: board }).exec();
        if (!post) {
            return { success: false, message: '존재하지 않는 게시글입니다.' };
        }

        const target = (post.comments ?? []).find((c: any) => String(c._id) === commentId);
        if (!target) {
            return { success: false, message: '존재하지 않는 댓글입니다.' };
        }
        if (String(target.writerId) !== String(sessionUser._id) && sessionUser.role !== 'admin') {
            return { success: false, message: '본인이 작성한 댓글만 삭제할 수 있습니다.' };
        }

        // 대댓글이 딸린 댓글을 지우면 그 대댓글들도 함께 정리
        const commentObjectId = new Types.ObjectId(commentId);
        const removedCount = (post.comments ?? []).filter(
            (c: any) => String(c._id) === commentId || String(c.parentId) === commentId,
        ).length;

        const updated = await model
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

    async toggleLike(
        board: string,
        type: string,
        id: string,
        sessionUser: { _id: string } | undefined,
    ) {
        const model = this.models[type];
        if (!model || !BOARDS.includes(board) || !isValidObjectId(id)) {
            return { success: false, message: '존재하지 않는 게시글입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }

        const userId = String(sessionUser._id);
        const existing = await model.findOne({ _id: id, type: board }).exec();
        if (!existing) {
            return { success: false, message: '존재하지 않는 게시글입니다.' };
        }

        const alreadyLiked = (existing.likes ?? []).some((likeId: any) => String(likeId) === userId);

        const post = await model
            .findOneAndUpdate(
                { _id: id, type: board },
                alreadyLiked
                    ? { $pull: { likes: userId }, $inc: { like_count: -1 } }
                    : { $addToSet: { likes: userId }, $inc: { like_count: 1 } },
                { new: true },
            )
            .exec();

        return { success: true, liked: !alreadyLiked, like_count: post.like_count };
    }
}
