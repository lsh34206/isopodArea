import { Module } from '@nestjs/common';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { ScheduleModule } from "@nestjs/schedule";
import {MongooseModule} from "@nestjs/mongoose"
import { marketSchema } from './schema/market.schema';
import { usersSchema } from '../auth/schema/users.schema';


const mongoSchema =MongooseModule.forFeature([
  { name: 'market', schema: marketSchema },
  { name: 'users', schema: usersSchema },
])

@Module({
  controllers: [MarketController],
  providers: [MarketService],
  imports:[mongoSchema,ScheduleModule.forRoot()]
})
export class MarketModule {
  constructor(){
    console.log("market모듈로드완료.");
  }
}
