import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { LoadStatus, UserRole } from '@prisma/client'
import { LoadsService } from './loads.service'
import { CreateLoadDto } from './dto/create-load.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@ApiTags('Loads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loads')
export class LoadsController {
  constructor(private readonly loadsService: LoadsService) {}

  @Post()
  @Roles(UserRole.load_owner)
  @ApiOperation({ summary: 'Post a new load' })
  async create(
    @Body() dto: CreateLoadDto,
    @CurrentUser('id') userId: string
  ) {
    return this.loadsService.create(userId, dto)
  }

  @Get('my-loads')
  @Roles(UserRole.load_owner)
  @ApiOperation({ summary: 'Get my posted loads with pagination' })
  async findMyLoads(
    @CurrentUser('id') userId: string,
    @Query('status') status?: LoadStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.loadsService.findByUser(
      userId, 
      status, 
      page ? parseInt(page, 10) : 1, 
      limit ? parseInt(limit, 10) : 50
    )
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get load details' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.loadsService.findOne(id, userId)
  }

  @Patch(':id/status')
  @Roles(UserRole.load_owner)
  @ApiOperation({ summary: 'Update load status' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: LoadStatus,
    @CurrentUser('id') userId: string
  ) {
    return this.loadsService.updateStatus(id, userId, status)
  }

  @Delete(':id')
  @Roles(UserRole.load_owner)
  @ApiOperation({ summary: 'Delete load (only if Open)' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.loadsService.delete(id, userId)
  }
}
