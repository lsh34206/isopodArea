import { Module } from '@nestjs/common';
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from '@nestjs/serve-static';
import {MongooseModule} from "@nestjs/mongoose"
import { join } from 'path';
import { usersSchema } from './schema/users.schema';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { communityFreeSchema } from '../community/schema/free.schema';
import { communityLibrarySchema } from '../community/schema/library.schema';
import { communityNoticeSchema } from '../community/schema/notice.schema';
import { communityQuestionSchema } from '../community/schema/question.schema';
import { careSheetSchema } from '../care-sheet/schema/careSheet.schema';
import { photoSchema } from '../photo/schema/photo.schema';
import { marketSchema } from '../market/schema/market.schema';



const mongoSchema =MongooseModule.forFeature([
  { name: 'users', schema: usersSchema },
  { name: 'communityFree', schema: communityFreeSchema },
  { name: 'communityLibrary', schema: communityLibrarySchema },
  { name: 'communityNotice', schema: communityNoticeSchema },
  { name: 'communityQuestion', schema: communityQuestionSchema },
  { name: 'CareSheet', schema: careSheetSchema },
  { name: 'photo', schema: photoSchema },
  { name: 'market', schema: marketSchema },
])

@Module(
{
  controllers: [AuthController
  ],
providers:[AuthService],
imports:[mongoSchema,

  ScheduleModule.forRoot()]
}
)

export class authModule{
 constructor(){
   console.log("auth 모듈 로드 완료");
 }
}
