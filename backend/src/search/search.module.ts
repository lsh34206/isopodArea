import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { communityFreeSchema } from '../community/schema/free.schema';
import { communityLibrarySchema } from '../community/schema/library.schema';
import { communityNoticeSchema } from '../community/schema/notice.schema';
import { communityQuestionSchema } from '../community/schema/question.schema';
import { careSheetSchema } from '../care-sheet/schema/careSheet.schema';
import { photoSchema } from '../photo/schema/photo.schema';
import { marketSchema } from '../market/schema/market.schema';
import { auctionSchema } from '../auction/schema/auction.schema';
import { usersSchema } from '../auth/schema/users.schema';

const mongoSchema = MongooseModule.forFeature([
    { name: 'communityFree', schema: communityFreeSchema },
    { name: 'communityLibrary', schema: communityLibrarySchema },
    { name: 'communityNotice', schema: communityNoticeSchema },
    { name: 'communityQuestion', schema: communityQuestionSchema },
    { name: 'CareSheet', schema: careSheetSchema },
    { name: 'photo', schema: photoSchema },
    { name: 'market', schema: marketSchema },
    { name: 'Auction', schema: auctionSchema },
    { name: 'users', schema: usersSchema },
]);

@Module({
    controllers: [SearchController],
    providers: [SearchService],
    imports: [mongoSchema],
})
export class SearchModule {
    constructor() {
        console.log('search 모듈 로드 완료');
    }
}
