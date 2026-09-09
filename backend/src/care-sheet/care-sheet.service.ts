import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { DateUtils } from 'src/utils/dateUtils';
import { FileUtils } from 'src/utils/fileUtils';
import { AvatarUtils } from 'src/utils/avatarUtils';

const BOARDS = ['isopod', 'millipede'];

@Injectable()
export class CareSheetService {
    constructor(
        @InjectModel('CareSheet') private readonly careSheetModel: Model<any>,
        @InjectModel('users') private readonly usersModel: Model<any>,
    ) {}

    async getCareSheets(board: string) {
        if (!BOARDS.includes(board)) {
            return { success: false, message: '존재하지 않는 게시판입니다.', careSheets: [] };
        }

        const careSheets = await this.careSheetModel
            .find({ type: board })
            .sort({ createdAt: -1 })
            .select('-description -likes -comments')
            .exec();

        return { success: true, careSheets: await AvatarUtils.attachAvatars(careSheets, this.usersModel) };
    }

    async getCareSheet(board: string, id: string, skipViewCount = false) {
        if (!BOARDS.includes(board) || !isValidObjectId(id)) {
            return { success: false, message: '존재하지 않는 케어시트입니다.', careSheet: null };
        }

        const careSheet = skipViewCount
            ? await this.careSheetModel.findOne({ _id: id, type: board }).exec()
            : await this.careSheetModel
                  .findOneAndUpdate(
                      { _id: id, type: board },
                      { $inc: { view_count: 1 } },
                      { new: true },
                  )
                  .exec();

        if (!careSheet) {
            return { success: false, message: '존재하지 않는 케어시트입니다.', careSheet: null };
        }
        return { success: true, careSheet };
    }

    async deleteCareSheet(
        board: string,
        id: string,
        sessionUser: { _id: string; role?: string } | undefined,
    ) {
        if (!BOARDS.includes(board) || !isValidObjectId(id)) {
            return { success: false, message: '존재하지 않는 케어시트입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }

        const careSheet = await this.careSheetModel.findOne({ _id: id, type: board }).exec();
        if (!careSheet) {
            return { success: false, message: '존재하지 않는 케어시트입니다.' };
        }
        if (String(careSheet.uploaderId) !== String(sessionUser._id) && sessionUser.role !== 'admin') {
            return { success: false, message: '본인이 작성한 케어시트만 삭제할 수 있습니다.' };
        }

        await this.careSheetModel.deleteOne({ _id: id, type: board }).exec();
        await FileUtils.removeUploadedFiles(careSheet.imgsPath ?? []);

        return { success: true, message: '케어시트가 삭제되었습니다.' };
    }

    async editCareSheet(
        board: string,
        id: string,
        body: {
            species?: string;
            subSpecies?: string;
            title?: string;
            description?: string;
            keepImages?: string | string[];
        },
        files: Array<{ filename: string }> | undefined,
        sessionUser: { _id: string; role?: string } | undefined,
    ) {
        if (!BOARDS.includes(board) || !isValidObjectId(id)) {
            return { success: false, message: '존재하지 않는 케어시트입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }

        const careSheet = await this.careSheetModel.findOne({ _id: id, type: board }).exec();
        if (!careSheet) {
            return { success: false, message: '존재하지 않는 케어시트입니다.' };
        }
        if (String(careSheet.uploaderId) !== String(sessionUser._id) && sessionUser.role !== 'admin') {
            return { success: false, message: '본인이 작성한 케어시트만 수정할 수 있습니다.' };
        }

        const species = (body.species ?? '').trim();
        const subSpecies = (body.subSpecies ?? '').trim();
        if (!species || !subSpecies) {
            return { success: false, message: '학명과 관용명을 입력해 주세요.' };
        }

        const title = (body.title ?? '').trim() || `${subSpecies} (${species})`;
        const description = (body.description ?? '').replace(/\r\n/g, '\n');

        const existingImages: string[] = careSheet.imgsPath ?? [];
        const keepImages = ([] as string[])
            .concat(body.keepImages ?? [])
            .filter((path) => existingImages.includes(path));
        const removedImages = existingImages.filter((path) => !keepImages.includes(path));
        const newImages = (files ?? []).map((file) => `/files/care-sheet/${file.filename}`);
        const imgsPath = [...keepImages, ...newImages].slice(0, 10);

        const updated = await this.careSheetModel
            .findOneAndUpdate(
                { _id: id, type: board },
                { $set: { species, subSpecies, title, description, imgsPath } },
                { new: true },
            )
            .exec();

        await FileUtils.removeUploadedFiles(removedImages);

        return { success: true, message: '케어시트가 수정되었습니다.', careSheet: updated };
    }

    async createCareSheet(
        board: string,
        body: { species?: string; subSpecies?: string; title?: string; description?: string },
        files: Array<{ filename: string }> | undefined,
        sessionUser: { _id: string; name: string } | undefined,
    ) {
        if (!BOARDS.includes(board)) {
            return { success: false, message: '존재하지 않는 게시판입니다.' };
        }
        if (!sessionUser) {
            return { success: false, message: '로그인이 필요합니다.' };
        }

        const species = (body.species ?? '').trim();
        const subSpecies = (body.subSpecies ?? '').trim();
        if (!species || !subSpecies) {
            return { success: false, message: '학명과 관용명을 입력해 주세요.' };
        }

        const title = (body.title ?? '').trim() || `${subSpecies} (${species})`;
        // multipart/form-data 전송 시 브라우저가 개행을 \r\n으로 정규화하므로 저장 전에 \n으로 통일
        const description = (body.description ?? '').replace(/\r\n/g, '\n');
        const imgsPath = (files ?? []).map((file) => `/files/care-sheet/${file.filename}`);

        const careSheet = await this.careSheetModel.create({
            title,
            type: board,
            species,
            subSpecies,
            description,
            uploaderId: sessionUser._id,
            uploaderName: sessionUser.name,
            imgsPath,
            createdAt: DateUtils.now_date(),
        });

        return { success: true, message: '케어시트가 등록되었습니다.', careSheet };
    }
}
