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
import { Optional } from '@nestjs/common'
import { LoadStatus, UserRole } from '@prisma/client'
import { LoadsService } from './loads.service'
import { CreateLoadDto } from './dto/create-load.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { MatchingService } from '../matching/matching.service'

@ApiTags('Loads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loads')
export class LoadsController {
  constructor(
    private readonly loadsService: LoadsService,
    @Optional() private readonly matchingService?: MatchingService,
  ) {}

  @Post()
  @Roles(UserRole.factory_owner, UserRole.transporter)
  @ApiOperation({ summary: 'Post a new load (Need Load) — triggers tonnage/route/budget matching & WhatsApp' })
  async create(
    @Body() dto: CreateLoadDto,
    @CurrentUser('id') userId: string
  ) {
    const load = await this.loadsService.create(userId, dto)
    // Fire-and-forget: evaluate Need Vehicle matches within 50km, tonnage/budget gated, triggers WhatsApp on match
    if (this.matchingService) {
      setImmediate(async () => {
        try {
          await this.matchingService!.evaluateMatchesForLoad(load.id, 50)
        } catch {
          // ignore background matching errors
        }
      })
    }
    return load
  }

  @Get('my-loads')
  @Roles(UserRole.factory_owner, UserRole.transporter)
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
  @Roles(UserRole.factory_owner, UserRole.transporter)
  @ApiOperation({ summary: 'Update load status (owner or admin only)' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: LoadStatus,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole
  ) {
    return this.loadsService.updateStatus(id, userId, status, role)
  }

  @Delete(':id')
  @Roles(UserRole.factory_owner, UserRole.transporter)
  @ApiOperation({ summary: 'Delete load (owner or admin only, and only if Open)' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole
  ) {
    return this.loadsService.delete(id, userId, role)
  }
}
