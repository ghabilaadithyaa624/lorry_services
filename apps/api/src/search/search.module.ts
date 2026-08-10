import { Module } from '@nestjs/common'
import { SearchController } from './search.controller'
import { SearchService } from './search.service'
import { MapmyIndiaService } from '../common/services/mapmyindia.service'

@Module({
  controllers: [SearchController],
  providers: [SearchService, MapmyIndiaService],
  exports: [SearchService],
})
export class SearchModule {}
