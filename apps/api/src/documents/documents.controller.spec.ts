import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let service: DocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: {
            generateUploadUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
    service = module.get<DocumentsService>(DocumentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generateUploadUrl', () => {
    it('should generate an upload url for a document', async () => {
      const mockUserId = 'user-123';
      const mockReq = { user: { userId: mockUserId } };
      const dto: GenerateUploadUrlDto = {
        entityId: 'entity-123',
        entityType: 'TRUCK',
        documentType: 'RC',
        contentType: 'image/jpeg',
      };

      const mockResponse = {
        uploadUrl: 'https://mocked-signed-url',
        key: 'documents/entity-123/RC-unique-id.jpg',
        expiresIn: 300,
      };

      jest.spyOn(service, 'generateUploadUrl').mockResolvedValue(mockResponse);

      const result = await controller.generateUploadUrl(mockReq, dto);

      expect(service.generateUploadUrl).toHaveBeenCalledWith(
        mockUserId,
        dto.entityId,
        dto.entityType,
        dto.documentType,
        dto.contentType,
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
