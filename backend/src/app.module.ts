import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from '@nestjs/serve-static';
import {MongooseModule} from "@nestjs/mongoose"
import { join } from 'path';
import { auctionModule } from './auction/auction.module';
import { authModule } from './auth/auth.module';
import { CommunityModule } from './community/community.module';
import { ChatModule } from './chat/chat.module';
import { PhotoModule } from './photo/photo.module';
import { MarketModule } from './market/market.module';
import { CareSheetModule } from './care-sheet/care-sheet.module';
import { SearchModule } from './search/search.module';
import { usersSchema } from './auth/schema/users.schema';
import { communityFreeSchema } from './community/schema/free.schema';
import { communityLibrarySchema } from './community/schema/library.schema';
import { communityNoticeSchema } from './community/schema/notice.schema';
import { communityQuestionSchema } from './community/schema/question.schema';
import { careSheetSchema } from './care-sheet/schema/careSheet.schema';
import { photoSchema } from './photo/schema/photo.schema';
import { marketSchema } from './market/schema/market.schema';
import { auctionSchema } from './auction/schema/auction.schema';

// AppService(홈 통계 집계)가 여러 게시판 모델을 직접 조회하므로,
// 각 모듈 내부에서만 쓰이던 스키마들을 AppModule 자신에게도 등록해 준다.
const statsSchema = MongooseModule.forFeature([
  { name: 'users', schema: usersSchema },
  { name: 'communityFree', schema: communityFreeSchema },
  { name: 'communityLibrary', schema: communityLibrarySchema },
  { name: 'communityNotice', schema: communityNoticeSchema },
  { name: 'communityQuestion', schema: communityQuestionSchema },
  { name: 'CareSheet', schema: careSheetSchema },
  { name: 'photo', schema: photoSchema },
  { name: 'market', schema: marketSchema },
  { name: 'Auction', schema: auctionSchema },
]);


const fileRoot = ServeStaticModule.forRoot({
  rootPath: join(process.cwd(), 'files'),
  serveRoot: '/files',
});
const mongoModule = MongooseModule.forRoot("mongodb+srv://lsh34206:shhs1004@cluster0.amaaaue.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",{dbName:"isopodArea",connectionFactory: (connection) => {
console.log("loaded");
connection.on('connected', () => {
  console.log('MongoDB connected');
});

connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

return connection;
}});



@Module(
{
  controllers: [AppController],
providers:[AppService],
imports:[mongoModule,
  statsSchema,
  fileRoot,
  auctionModule,
  ScheduleModule.forRoot(),
  authModule,
  CommunityModule,
  ChatModule,
  PhotoModule,
  MarketModule,
  CareSheetModule,
  SearchModule]
}
)

export class appModule{
 constructor(){
   console.log("app모듈 로드 완료");
 }
}
