import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { AuthService } from './auth.service';

const uploadDir = join(process.cwd(), 'files', 'avatar');

const avatarStorage = diskStorage({
    destination: (req, file, cb) => {
        mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
        cb(null, unique);
    },
});

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('signup')
    async signup(@Body() body) {
        return this.authService.signup(body);
    }

    @Post('login')
    async login(@Body() body, @Req() req) {
        const result = await this.authService.login(body?.email, body?.password);

        if (result.success && result.user) {
            req.session.user = {
                _id: result.user._id,
                name: result.user.name,
                email: result.user.email,
                role: result.user.role,
            };
        }

        return { success: result.success, message: result.message };
    }

    @Post('logout')
    logout(@Req() req, @Res() res) {
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.json({ success: true, message: '로그아웃되었습니다.' });
        });
    }

    @Get('me')
    me(@Req() req) {
        if (req.session?.user) {
            return { success: true, user: req.session.user };
        }
        return { success: false, user: null };
    }

    @Get('users/:id')
    async getUserProfile(@Param('id') id: string) {
        return this.authService.getUserProfile(id);
    }

    @Patch('me/password')
    async changePassword(@Body() body, @Req() req) {
        return this.authService.changePassword(req.session?.user, body?.currentPassword, body?.newPassword);
    }

    @Patch('me/profile')
    async updateProfile(@Body() body, @Req() req) {
        return this.authService.updateProfile(req.session?.user, body?.bio);
    }

    @Post('me/avatar')
    @UseInterceptors(
        FileInterceptor('avatar', {
            storage: avatarStorage,
            limits: { fileSize: 4 * 1024 * 1024 },
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.startsWith('image/')) {
                    return cb(new BadRequestException('이미지 파일만 업로드할 수 있습니다.'), false);
                }
                cb(null, true);
            },
        }),
    )
    async uploadAvatar(@UploadedFile() file, @Req() req) {
        return this.authService.updateAvatar(req.session?.user, file);
    }

    @Delete('me')
    async withdraw(@Body() body, @Req() req, @Res() res) {
        const result = await this.authService.withdraw(req.session?.user, body?.password);

        if (!result.success) {
            return res.json(result);
        }

        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.json(result);
        });
    }
}
