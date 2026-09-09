import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { DateUtils } from 'src/utils/dateUtils';
import { FileUtils } from 'src/utils/fileUtils';

const WITHDRAWN_NAME = '탈퇴된 회원';

@Injectable()
export class AuthService {
    private readonly postModels: Model<any>[];

    constructor(
        @InjectModel('users') private readonly usersModel: Model<any>,
        @InjectModel('communityFree') communityFreeModel: Model<any>,
        @InjectModel('communityLibrary') communityLibraryModel: Model<any>,
        @InjectModel('communityNotice') communityNoticeModel: Model<any>,
        @InjectModel('communityQuestion') communityQuestionModel: Model<any>,
        @InjectModel('CareSheet') careSheetModel: Model<any>,
        @InjectModel('photo') photoModel: Model<any>,
        @InjectModel('market') private readonly marketModel: Model<any>,
    ) {
        this.postModels = [
            communityFreeModel,
            communityLibraryModel,
            communityNoticeModel,
            communityQuestionModel,
            careSheetModel,
            photoModel,
        ];
    }

    // 저장 형식: "salt:hash"
    hashPassword(password: string): string {
        const salt = randomBytes(16).toString('hex');
        const hash = scryptSync(password, salt, 64).toString('hex');
        return `${salt}:${hash}`;
    }

    verifyPassword(password: string, stored: string): boolean {
        const [salt, hash] = stored.split(':');
        if (!salt || !hash) return false;
        const hashBuffer = Buffer.from(hash, 'hex');
        const testBuffer = scryptSync(password, salt, 64);
        return hashBuffer.length === testBuffer.length && timingSafeEqual(hashBuffer, testBuffer);
    }

    async signup(body: { name?: string; email?: string; password?: string; phone?: string }) {
        const name = (body.name ?? '').trim();
        const email = (body.email ?? '').trim().toLowerCase();
        const password = body.password ?? '';
        const phone = (body.phone ?? '').trim();

        if (!name || !email || !password) {
            return { success: false, message: '이름, 이메일, 비밀번호를 모두 입력해 주세요.' };
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return { success: false, message: '올바른 이메일 형식이 아닙니다.' };
        }
        if (password.length < 8) {
            return { success: false, message: '비밀번호는 8자 이상이어야 합니다.' };
        }

        const exists = await this.usersModel.findOne({ email }).exec();
        if (exists) {
            return { success: false, message: '이미 가입된 이메일입니다.' };
        }

        await this.usersModel.create({
            name,
            email,
            password: this.hashPassword(password),
            phone,
            createdAt: DateUtils.now_date(),
        });

        return { success: true, message: '회원가입이 완료되었습니다. 로그인해 주세요.' };
    }

    async login(email: string, password: string) {
        if (!email || !password) {
            return { success: false, message: '이메일과 비밀번호를 입력해 주세요.', user: null };
        }

        const user = await this.usersModel.findOne({ email: email.trim().toLowerCase() }).exec();
        if (!user || !this.verifyPassword(password, user.password)) {
            return { success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.', user: null };
        }
        if (user.isActive !== 1) {
            return { success: false, message: '비활성화된 계정입니다.', user: null };
        }

        return { success: true, message: `${user.name}님, 환영합니다!`, user };
    }

    async getUserProfile(id: string) {
        if (!isValidObjectId(id)) {
            return { success: false, message: '존재하지 않는 회원입니다.', user: null };
        }

        const user = await this.usersModel.findById(id).select('name role createdAt avatarPath bio').exec();
        if (!user) {
            return { success: false, message: '존재하지 않는 회원입니다.', user: null };
        }

        return { success: true, user };
    }

    async changePassword(
        sessionUser: { _id: string } | undefined,
        currentPassword: string,
        newPassword: string,
    ) {
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }
        if (!currentPassword || !newPassword) {
            return { success: false, message: '현재 비밀번호와 새 비밀번호를 모두 입력해 주세요.' };
        }
        if (newPassword.length < 8) {
            return { success: false, message: '새 비밀번호는 8자 이상이어야 합니다.' };
        }

        const user = await this.usersModel.findById(sessionUser._id).exec();
        if (!user) {
            return { success: false, message: '존재하지 않는 계정입니다.' };
        }
        if (!this.verifyPassword(currentPassword, user.password)) {
            return { success: false, message: '현재 비밀번호가 올바르지 않습니다.' };
        }
        if (currentPassword === newPassword) {
            return { success: false, message: '현재 비밀번호와 다른 비밀번호를 입력해 주세요.' };
        }

        await this.usersModel
            .updateOne({ _id: sessionUser._id }, { $set: { password: this.hashPassword(newPassword) } })
            .exec();

        return { success: true, message: '비밀번호가 변경되었습니다.' };
    }

    async updateProfile(
        sessionUser: { _id: string } | undefined,
        bio: string,
    ) {
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }
        if ((bio ?? '').length > 300) {
            return { success: false, message: '자기소개는 300자 이내로 입력해 주세요.' };
        }

        const trimmedBio = (bio ?? '').trim();
        await this.usersModel.updateOne({ _id: sessionUser._id }, { $set: { bio: trimmedBio } }).exec();

        return { success: true, message: '프로필이 저장되었습니다.', bio: trimmedBio };
    }

    async updateAvatar(
        sessionUser: { _id: string } | undefined,
        file: { filename: string } | undefined,
    ) {
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }
        if (!file) {
            return { success: false, message: '이미지 파일을 선택해 주세요.' };
        }

        const user = await this.usersModel.findById(sessionUser._id).exec();
        if (!user) {
            return { success: false, message: '존재하지 않는 계정입니다.' };
        }

        const avatarPath = `/files/avatar/${file.filename}`;
        const previousAvatarPath = user.avatarPath;

        await this.usersModel.updateOne({ _id: sessionUser._id }, { $set: { avatarPath } }).exec();
        if (previousAvatarPath) {
            await FileUtils.removeUploadedFiles([previousAvatarPath]);
        }

        return { success: true, message: '프로필 사진이 변경되었습니다.', avatarPath };
    }

    async withdraw(sessionUser: { _id: string } | undefined, password: string) {
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }
        if (!password) {
            return { success: false, message: '비밀번호를 입력해 주세요.' };
        }

        const user = await this.usersModel.findById(sessionUser._id).exec();
        if (!user) {
            return { success: false, message: '존재하지 않는 계정입니다.' };
        }
        if (!this.verifyPassword(password, user.password)) {
            return { success: false, message: '비밀번호가 올바르지 않습니다.' };
        }

        await this.usersModel.deleteOne({ _id: sessionUser._id }).exec();
        if (user.avatarPath) {
            await FileUtils.removeUploadedFiles([user.avatarPath]);
        }
        await this.anonymizeUserContent(String(sessionUser._id));

        return { success: true, message: '회원 탈퇴가 완료되었습니다.' };
    }

    // 탈퇴 회원이 남긴 글/댓글은 삭제하지 않고 작성자 표시만 "탈퇴된 회원"으로 변경.
    // uploaderId는 스키마에 ObjectId로 선언돼 있어 문자열을 넘겨도 Mongoose가 캐스팅하지만,
    // comments는 스키마 없는 Array라 저장된 그대로(문자열)와 비교해야 하므로 두 타입 모두 매칭한다.
    private async anonymizeUserContent(userId: string) {
        const idVariants: unknown[] = [userId];
        if (Types.ObjectId.isValid(userId)) {
            idVariants.push(new Types.ObjectId(userId));
        }

        await Promise.all([
            ...this.postModels.flatMap((model) => [
                model.updateMany(
                    { uploaderId: { $in: idVariants } },
                    { $set: { uploaderName: WITHDRAWN_NAME } },
                ).exec(),
                model.updateMany(
                    { 'comments.writerId': { $in: idVariants } },
                    { $set: { 'comments.$[c].writerName': WITHDRAWN_NAME } },
                    { arrayFilters: [{ 'c.writerId': { $in: idVariants } }] },
                ).exec(),
            ]),
            // market은 필드명이 sellerId/sellerName이라 다른 게시판과 별도로 처리
            this.marketModel.updateMany(
                { sellerId: { $in: idVariants } },
                { $set: { sellerName: WITHDRAWN_NAME } },
            ).exec(),
            this.marketModel.updateMany(
                { 'comments.writerId': { $in: idVariants } },
                { $set: { 'comments.$[c].writerName': WITHDRAWN_NAME } },
                { arrayFilters: [{ 'c.writerId': { $in: idVariants } }] },
            ).exec(),
        ]);
    }
}
