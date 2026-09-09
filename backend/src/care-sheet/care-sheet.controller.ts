import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { CareSheetService } from './care-sheet.service';
import { ViewUtils } from 'src/utils/viewUtils';

const uploadDir = join(process.cwd(), 'files', 'care-sheet');

const imageStorage = diskStorage({
    destination: (req, file, cb) => {
        mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
        cb(null, unique);
    },
});

@Controller('care-sheet')
export class CareSheetController {
    constructor(private readonly careSheetService: CareSheetService) {}

    @Get(':board')
    async getCareSheets(@Param('board') board: string) {
        return this.careSheetService.getCareSheets(board);
    }

    @Get(':board/:id')
    async getCareSheet(@Param('board') board: string, @Param('id') id: string, @Req() req) {
        const viewKey = `care-sheet:${board}:${id}`;
        const alreadyViewed = ViewUtils.hasViewed(req, viewKey);
        const result = await this.careSheetService.getCareSheet(board, id, alreadyViewed);
        if (result.success && !alreadyViewed) {
            ViewUtils.markViewed(req, viewKey);
        }
        return result;
    }

    @Delete(':board/:id')
    async deleteCareSheet(@Param('board') board: string, @Param('id') id: string, @Req() req) {
        return this.careSheetService.deleteCareSheet(board, id, req.session?.user);
    }

    @Post(':board')
    @UseInterceptors(
        FilesInterceptor('images', 10, {
            storage: imageStorage,
            limits: { fileSize: 8 * 1024 * 1024 },
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.startsWith('image/')) {
                    return cb(new BadRequestException('이미지 파일만 업로드할 수 있습니다.'), false);
                }
                cb(null, true);
            },
        }),
    )
    async createCareSheet(
        @Param('board') board: string,
        @Body() body,
        @UploadedFiles() files,
        @Req() req,
    ) {
        return this.careSheetService.createCareSheet(board, body, files, req.session?.user);
    }

    @Patch(':board/:id')
    @UseInterceptors(
        FilesInterceptor('images', 10, {
            storage: imageStorage,
            limits: { fileSize: 8 * 1024 * 1024 },
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.startsWith('image/')) {
                    return cb(new BadRequestException('이미지 파일만 업로드할 수 있습니다.'), false);
                }
                cb(null, true);
            },
        }),
    )
    async editCareSheet(
        @Param('board') board: string,
        @Param('id') id: string,
        @Body() body,
        @UploadedFiles() files,
        @Req() req,
    ) {
        return this.careSheetService.editCareSheet(board, id, body, files, req.session?.user);
    }
}
