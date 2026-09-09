import { Module } from '@nestjs/common';
import { CareSheetController } from './care-sheet.controller';
import { CareSheetService } from './care-sheet.service';
import { ScheduleModule } from "@nestjs/schedule";
import {MongooseModule} from "@nestjs/mongoose"
import { careSheetSchema } from './schema/careSheet.schema';
import { usersSchema } from '../auth/schema/users.schema';
const mongoSchema =MongooseModule.forFeature([
  { name: 'CareSheet', schema: careSheetSchema },
  { name: 'users', schema: usersSchema },
])
@Module({
  controllers: [CareSheetController],
  providers:[CareSheetService],
  imports:[mongoSchema,ScheduleModule.forRoot()]
})
export class CareSheetModule {

constructor(){
  console.log("caresheet 모듈 로드 완료");
}
}
