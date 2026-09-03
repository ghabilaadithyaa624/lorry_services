import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import { TrucksService } from './trucks.service'
import { CreateTruckDto } from './dto/create-truck.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@ApiTags('Trucks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('trucks')
export class TrucksController {
  constructor(private readonly trucksService: TrucksService) {}

  @Post()
  @Roles(UserRole.truck_owner, UserRole.driver)
  @ApiOperation({ summary: 'Register a new truck' })
  async create(
    @Body() dto: CreateTruckDto,
    @CurrentUser('id') userId: string
  ) {
    return this.trucksService.create(userId, dto)
  }

  @Post(':id/documents/:type')
  @Roles(UserRole.truck_owner, UserRole.driver)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload RC or Insurance document' })
  async uploadDocument(
    @Param('id') truckId: string,
    @Param('type') docType: 'RC' | 'Insurance',
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Body('docNumber') docNumber?: string
  ) {
    return this.trucksService.uploadDocument(truckId, userId, file, docType, docNumber)
  }

  @Get('my-trucks')
  @Roles(UserRole.truck_owner, UserRole.driver)
  @ApiOperation({ summary: 'Get my registered trucks' })
  async findMyTrucks(@CurrentUser('id') userId: string) {
    return this.trucksService.findByUser(userId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get truck details' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.trucksService.findOne(id, userId)
  }

  @Patch(':id/location')
  @Roles(UserRole.truck_owner, UserRole.driver)
  @ApiOperation({ summary: 'Update truck current location' })
  async updateLocation(
    @Param('id') id: string,
    @Body('address') address: string,
    @CurrentUser('id') userId: string
  ) {
    return this.trucksService.updateLocation(id, userId, address)
  }
}
