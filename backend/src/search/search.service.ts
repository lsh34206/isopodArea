import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AvatarUtils } from 'src/utils/avatarUtils';

const RESULT_LIMIT_PER_SOURCE = 20;

const BOARD_LABELS: Record<string, string> = {
    isopod: '등각류',
    millipede: '배각류',
};

function escapeRegExp(text: string) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class SearchService {
    constructor(
        @InjectModel('communityFree') private readonly communityFreeModel: Model<any>,
        @InjectModel('communityLibrary') private readonly communityLibraryModel: Model<any>,
        @InjectModel('communityNotice') private readonly communityNoticeModel: Model<any>,
        @InjectModel('communityQuestion') private readonly communityQuestionModel: Model<any>,
        @InjectModel('CareSheet') private readonly careSheetModel: Model<any>,
        @InjectModel('photo') private readonly photoModel: Model<any>,
        @InjectModel('market') private readonly marketModel: Model<any>,
        @InjectModel('Auction') private readonly auctionModel: Model<any>,
        @InjectModel('users') private readonly usersModel: Model<any>,
    ) {}

    async search(query: string) {
        const keyword = (query ?? '').trim();
        if (!keyword) {
            return { success: true, results: [] };
        }

        const regex = new RegExp(escapeRegExp(keyword), 'i');

        const communityModels: [string, Model<any>][] = [
            ['free', this.communityFreeModel],
            ['library', this.communityLibraryModel],
            ['notice', this.communityNoticeModel],
            ['question', this.communityQuestionModel],
        ];

        const [communityResults, careSheetResults, photoResults, marketResults, auctionResults] = await Promise.all([
            Promise.all(
                communityModels.map(async ([type, model]) => {
                    const posts = await model
                        .find({ $or: [{ title: regex }, { content: regex }] })
                        .sort({ createdAt: -1 })
                        .limit(RESULT_LIMIT_PER_SOURCE)
                        .select('-content -likes -comments')
                        .exec();

                    return AvatarUtils.attachAvatars(posts, this.usersModel).then((enriched) =>
                        enriched.map((post: any) => ({
                            id: post._id,
                            category: BOARD_LABELS[post.type] ?? post.type,
                            title: post.title,
                            author: post.uploaderName,
                            authorId: post.uploaderId,
                            authorAvatar: post.uploaderAvatar,
                            comments: post.comment_count ?? 0,
                            createdAt: post.createdAt,
                            href: `/community/${post.type}/${type}/${post._id}`,
                        })),
                    );
                }),
            ),
            this.careSheetModel
                .find({ $or: [{ title: regex }, { species: regex }, { subSpecies: regex }] })
                .sort({ createdAt: -1 })
                .limit(RESULT_LIMIT_PER_SOURCE)
                .select('-description -likes -comments')
                .exec()
                .then((careSheets) => AvatarUtils.attachAvatars(careSheets, this.usersModel))
                .then((enriched) =>
                    enriched.map((cs: any) => ({
                        id: cs._id,
                        category: '사육 정보',
                        title: cs.title,
                        author: cs.uploaderName,
                        authorId: cs.uploaderId,
                        authorAvatar: cs.uploaderAvatar,
                        comments: cs.comment_count ?? 0,
                        createdAt: cs.createdAt,
                        href: `/care-sheet/${cs.type}/${cs._id}`,
                    })),
                ),
            this.photoModel
                .find({ $or: [{ title: regex }, { species: regex }, { subSpecies: regex }] })
                .sort({ createdAt: -1 })
                .limit(RESULT_LIMIT_PER_SOURCE)
                .select('-description -likes -comments')
                .exec()
                .then((photos) => AvatarUtils.attachAvatars(photos, this.usersModel))
                .then((enriched) =>
                    enriched.map((photo: any) => ({
                        id: photo._id,
                        category: '갤러리',
                        title: photo.title,
                        author: photo.uploaderName,
                        authorId: photo.uploaderId,
                        authorAvatar: photo.uploaderAvatar,
                        comments: photo.comment_count ?? 0,
                        createdAt: photo.createdAt,
                        href: `/gallery/${photo.type}/${photo._id}`,
                    })),
                ),
            this.marketModel
                .find({ $or: [{ title: regex }, { species: regex }, { subSpecies: regex }] })
                .sort({ createdAt: -1 })
                .limit(RESULT_LIMIT_PER_SOURCE)
                .select('-description -likes -comments')
                .exec()
                .then((listings) => AvatarUtils.attachAvatars(listings, this.usersModel, 'sellerId'))
                .then((enriched) =>
                    enriched.map((listing: any) => ({
                        id: listing._id,
                        category: '분양',
                        title: listing.title,
                        author: listing.sellerName,
                        authorId: listing.sellerId,
                        authorAvatar: listing.uploaderAvatar,
                        comments: listing.comment_count ?? 0,
                        createdAt: listing.createdAt,
                        href: `/market/${listing.type}/${listing._id}`,
                    })),
                ),
            this.auctionModel
                .find({ $or: [{ title: regex }, { species: regex }, { subSpecies: regex }] })
                .sort({ createdAt: -1 })
                .limit(RESULT_LIMIT_PER_SOURCE)
                .select('-description')
                .exec()
                .then((auctions) => AvatarUtils.attachAvatars(auctions, this.usersModel, 'sellerId'))
                .then((enriched) =>
                    enriched.map((auction: any) => ({
                        id: auction._id,
                        category: '경매',
                        title: auction.title,
                        author: auction.sellerName,
                        authorId: auction.sellerId,
                        authorAvatar: auction.uploaderAvatar,
                        comments: 0,
                        createdAt: auction.createdAt,
                        href: `/auction/${auction.type}/${auction._id}`,
                    })),
                ),
        ]);

        const results = [
            ...communityResults.flat(),
            ...careSheetResults,
            ...photoResults,
            ...marketResults,
            ...auctionResults,
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return { success: true, results };
    }
}
