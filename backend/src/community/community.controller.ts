import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { CommunityService } from './community.service';
import { ViewUtils } from 'src/utils/viewUtils';

const uploadDir = join(process.cwd(), 'files', 'community');

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

@Controller('community')
export class CommunityController {
    constructor(private readonly communityService: CommunityService) {}

    @Get(':board/:type')
    async getPosts(@Param('board') board: string, @Param('type') type: string) {
        return this.communityService.getPosts(board, type);
    }

    @Get(':board/:type/:id')
    async getPost(
        @Param('board') board: string,
        @Param('type') type: string,
        @Param('id') id: string,
        @Req() req,
    ) {
        const viewKey = `community:${type}:${board}:${id}`;
        const alreadyViewed = ViewUtils.hasViewed(req, viewKey);
        const result = await this.communityService.getPost(board, type, id, alreadyViewed);
        if (result.success && !alreadyViewed) {
            ViewUtils.markViewed(req, viewKey);
        }
        return result;
    }

    @Delete(':board/:type/:id')
    async deletePost(
        @Param('board') board: string,
        @Param('type') type: string,
        @Param('id') id: string,
        @Req() req,
    ) {
        return this.communityService.deletePost(board, type, id, req.session?.user);
    }

    @Post(':board/:type')
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
    async createPost(
        @Param('board') board: string,
        @Param('type') type: string,
        @Body() body,
        @UploadedFiles() files,
        @Req() req,
    ) {
        return this.communityService.createPost(board, type, body, files, req.session?.user);
    }

    @Patch(':board/:type/:id')
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
    async editPost(
        @Param('board') board: string,
        @Param('type') type: string,
        @Param('id') id: string,
        @Body() body,
        @UploadedFiles() files,
        @Req() req,
    ) {
        return this.communityService.editPost(board, type, id, body, files, req.session?.user);
    }

    @Post(':board/:type/:id/comments')
    async addComment(
        @Param('board') board: string,
        @Param('type') type: string,
        @Param('id') id: string,
        @Body() body,
        @Req() req,
    ) {
        return this.communityService.addComment(board, type, id, body, req.session?.user);
    }

    @Patch(':board/:type/:id/comments/:commentId')
    async editComment(
        @Param('board') board: string,
        @Param('type') type: string,
        @Param('id') id: string,
        @Param('commentId') commentId: string,
        @Body() body,
        @Req() req,
    ) {
        return this.communityService.editComment(board, type, id, commentId, body, req.session?.user);
    }

    @Delete(':board/:type/:id/comments/:commentId')
    async deleteComment(
        @Param('board') board: string,
        @Param('type') type: string,
        @Param('id') id: string,
        @Param('commentId') commentId: string,
        @Req() req,
    ) {
        return this.communityService.deleteComment(board, type, id, commentId, req.session?.user);
    }

    @Post(':board/:type/:id/like')
    async toggleLike(
        @Param('board') board: string,
        @Param('type') type: string,
        @Param('id') id: string,
        @Req() req,
    ) {
        return this.communityService.toggleLike(board, type, id, req.session?.user);
    }
}
