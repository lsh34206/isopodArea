import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Req, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { AuctionService } from './auction.service';

const uploadDir = join(process.cwd(), 'files', 'auction');

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

@Controller('auction')
export class AuctionController {
    constructor(private readonly auctionService: AuctionService) {}

    @Get(':board')
    async getAuctions(@Param('board') board: string) {
        return this.auctionService.getAuctions(board);
    }

    @Get(':board/:id')
    async getAuction(@Param('board') board: string, @Param('id') id: string) {
        return this.auctionService.getAuction(board, id);
    }

    @Delete(':board/:id')
    async deleteAuction(@Param('board') board: string, @Param('id') id: string, @Req() req) {
        return this.auctionService.deleteAuction(board, id, req.session?.user);
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
    async createAuction(
        @Param('board') board: string,
        @Body() body,
        @UploadedFiles() files,
        @Req() req,
    ) {
        return this.auctionService.createAuction(board, body, files, req.session?.user);
    }
}
