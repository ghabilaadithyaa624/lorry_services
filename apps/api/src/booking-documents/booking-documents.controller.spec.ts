import { Test, TestingModule } from '@nestjs/testing'
import { BookingDocumentsController } from './booking-documents.controller'
import { AdminBookingDocumentsController } from './booking-documents.admin.controller'
import { BookingDocumentsService } from './booking-documents.service'

// The service module imports `@lorrycarry/database`; replace it so unit tests
// never construct a PrismaClient (mirrors bookings/admin spec conventions).
jest.mock('@lorrycarry/database', () => ({
  prisma: { booking: {}, bookingDocument: {} },
}))

describe('BookingDocumentsController', () => {
  let controller: BookingDocumentsController
  let service: BookingDocumentsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingDocumentsController],
      providers: [
        {
          provide: BookingDocumentsService,
          useValue: {
            list: jest.fn(),
            requestUploadUrl: jest.fn(),
            register: jest.fn(),
            getDownloadUrl: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<BookingDocumentsController>(BookingDocumentsController)
    service = module.get<BookingDocumentsService>(BookingDocumentsService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('list', () => {
    it('should list documents for the booking with the current user context', async () => {
      const mockResponse = { bookingId: 'b1', documents: [] }
      jest.spyOn(service, 'list').mockResolvedValue(mockResponse as any)

      const result = await controller.list('b1', 'user-1', 'factory_owner')

      expect(service.list).toHaveBeenCalledWith('b1', { id: 'user-1', role: 'factory_owner' })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('requestUploadUrl', () => {
    it('should delegate upload-url requests', async () => {
      const dto = { stage: 'POD', fileName: 'pod.jpg', contentType: 'image/jpeg' }
      const mockResponse = { uploadUrl: 'https://signed', key: 'booking-documents/b1/POD/x.jpg', expiresIn: 300 }
      jest.spyOn(service, 'requestUploadUrl').mockResolvedValue(mockResponse as any)

      const result = await controller.requestUploadUrl('b1', 'user-1', 'truck_driver', dto as any)

      expect(service.requestUploadUrl).toHaveBeenCalledWith('b1', { id: 'user-1', role: 'truck_driver' }, dto)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('register', () => {
    it('should delegate document registration', async () => {
      const dto = { stage: 'POD', key: 'booking-documents/b1/POD/x.jpg', contentType: 'image/jpeg' }
      const mockResponse = { id: 'doc-1', stage: 'POD' }
      jest.spyOn(service, 'register').mockResolvedValue(mockResponse as any)

      const result = await controller.register('b1', 'user-1', 'factory_owner', dto as any)

      expect(service.register).toHaveBeenCalledWith('b1', { id: 'user-1', role: 'factory_owner' }, dto)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getDownloadUrl', () => {
    it('should delegate download-url requests', async () => {
      const mockResponse = { downloadUrl: 'https://signed-download', expiresIn: 3600 }
      jest.spyOn(service, 'getDownloadUrl').mockResolvedValue(mockResponse as any)

      const result = await controller.getDownloadUrl('b1', 'doc-1', 'user-1', 'admin')

      expect(service.getDownloadUrl).toHaveBeenCalledWith('b1', 'doc-1', { id: 'user-1', role: 'admin' })
      expect(result).toEqual(mockResponse)
    })
  })
})

describe('AdminBookingDocumentsController', () => {
  let controller: AdminBookingDocumentsController
  let service: BookingDocumentsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminBookingDocumentsController],
      providers: [
        {
          provide: BookingDocumentsService,
          useValue: {
            listForAdmin: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<AdminBookingDocumentsController>(AdminBookingDocumentsController)
    service = module.get<BookingDocumentsService>(BookingDocumentsService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('should list the review queue with query filters', async () => {
    const query = { status: 'Pending', page: 2, limit: 20 }
    const mockResponse = { data: [], total: 0, page: 2, limit: 20 }
    jest.spyOn(service, 'listForAdmin').mockResolvedValue(mockResponse as any)

    const result = await controller.list(query as any)

    expect(service.listForAdmin).toHaveBeenCalledWith({
      status: 'Pending',
      bookingId: undefined,
      page: 2,
      limit: 20,
    })
    expect(result).toEqual(mockResponse)
  })

  it('should verify/reject a document as the acting admin', async () => {
    const dto = { status: 'Verified' as const, notes: 'POD matches delivery record' }
    const mockResponse = { id: 'doc-1', verificationStatus: 'Verified' }
    jest.spyOn(service, 'verify').mockResolvedValue(mockResponse as any)

    const result = await controller.verify('doc-1', dto, 'admin-1')

    expect(service.verify).toHaveBeenCalledWith('admin-1', 'doc-1', 'Verified', 'POD matches delivery record')
    expect(result).toEqual(mockResponse)
  })
})
