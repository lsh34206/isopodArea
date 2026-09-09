import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { PhotoService } from './photo.service';
import { ViewUtils } from 'src/utils/viewUtils';

const uploadDir = join(process.cwd(), 'files', 'photo');

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

@Controller('photo')
export class PhotoController {
    constructor(private readonly photoService: PhotoService) {}

    @Get(':board')
    async getPhotos(@Param('board') board: string) {
        return this.photoService.getPhotos(board);
    }

    @Get(':board/:id')
    async getPhoto(@Param('board') board: string, @Param('id') id: string, @Req() req) {
        const viewKey = `photo:${board}:${id}`;
        const alreadyViewed = ViewUtils.hasViewed(req, viewKey);
        const result = await this.photoService.getPhoto(board, id, alreadyViewed);
        if (result.success && !alreadyViewed) {
            ViewUtils.markViewed(req, viewKey);
        }
        return result;
    }

    @Delete(':board/:id')
    async deletePhoto(@Param('board') board: string, @Param('id') id: string, @Req() req) {
        return this.photoService.deletePhoto(board, id, req.session?.user);
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
    async createPhoto(
        @Param('board') board: string,
        @Body() body,
        @UploadedFiles() files,
        @Req() req,
    ) {
        return this.photoService.createPhoto(board, body, files, req.session?.user);
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
    async editPhoto(
        @Param('board') board: string,
        @Param('id') id: string,
        @Body() body,
        @UploadedFiles() files,
        @Req() req,
    ) {
        return this.photoService.editPhoto(board, id, body, files, req.session?.user);
    }

    @Post(':board/:id/comments')
    async addComment(
        @Param('board') board: string,
        @Param('id') id: string,
        @Body() body,
        @Req() req,
    ) {
        return this.photoService.addComment(board, id, body, req.session?.user);
    }

    @Patch(':board/:id/comments/:commentId')
    async editComment(
        @Param('board') board: string,
        @Param('id') id: string,
        @Param('commentId') commentId: string,
        @Body() body,
        @Req() req,
    ) {
        return this.photoService.editComment(board, id, commentId, body, req.session?.user);
    }

    @Delete(':board/:id/comments/:commentId')
    async deleteComment(
        @Param('board') board: string,
        @Param('id') id: string,
        @Param('commentId') commentId: string,
        @Req() req,
    ) {
        return this.photoService.deleteComment(board, id, commentId, req.session?.user);
    }

    @Post(':board/:id/like')
    async toggleLike(@Param('board') board: string, @Param('id') id: string, @Req() req) {
        return this.photoService.toggleLike(board, id, req.session?.user);
    }
}
