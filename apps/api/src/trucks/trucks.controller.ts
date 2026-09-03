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
import { Optional } from '@nestjs/common'
import { TrucksService } from './trucks.service'
import { CreateTruckDto } from './dto/create-truck.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { MatchingService } from '../matching/matching.service'

@ApiTags('Trucks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('trucks')
export class TrucksController {
  constructor(
    private readonly trucksService: TrucksService,
    @Optional() private readonly matchingService?: MatchingService,
  ) {}

  @Post()
  @Roles(UserRole.truck_owner, UserRole.driver)
  @ApiOperation({ summary: 'Register a new truck (Need Vehicle) — triggers tonnage/route/budget matching & WhatsApp' })
  async create(
    @Body() dto: CreateTruckDto,
    @CurrentUser('id') userId: string
  ) {
    const truck = await this.trucksService.create(userId, dto)
    if (this.matchingService) {
      setImmediate(async () => {
        try {
          await this.matchingService!.evaluateMatchesForTruck(truck.id, 50)
        } catch {
          // ignore background
        }
      })
    }
    return truck
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
  @ApiOperation({ summary: 'Update truck current location — re-evaluates proximity matches' })
  async updateLocation(
    @Param('id') id: string,
    @Body('address') address: string,
    @CurrentUser('id') userId: string
  ) {
    const updated = await this.trucksService.updateLocation(id, userId, address)
    if (this.matchingService) {
      setImmediate(async () => {
        try {
          await this.matchingService!.evaluateMatchesForTruck(id, 50)
        } catch {
          // ignore
        }
      })
    }
    return updated
  }
}
