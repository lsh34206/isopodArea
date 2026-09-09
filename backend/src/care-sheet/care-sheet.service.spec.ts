import { Test, TestingModule } from '@nestjs/testing';
import { CareSheetService } from './care-sheet.service';

describe('CareSheetService', () => {
  let service: CareSheetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CareSheetService],
    }).compile();

    service = module.get<CareSheetService>(CareSheetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
