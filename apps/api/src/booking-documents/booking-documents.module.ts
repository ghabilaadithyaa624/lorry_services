import { Module } from '@nestjs/common'
import { BookingDocumentsController } from './booking-documents.controller'
import { AdminBookingDocumentsController } from './booking-documents.admin.controller'
import { BookingDocumentsService } from './booking-documents.service'
import { S3Service } from '../common/services/s3.service'

@Module({
  controllers: [BookingDocumentsController, AdminBookingDocumentsController],
  providers: [BookingDocumentsService, S3Service],
  exports: [BookingDocumentsService],
})
export class BookingDocumentsModule {}
