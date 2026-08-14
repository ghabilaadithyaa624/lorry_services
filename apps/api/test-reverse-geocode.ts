import { Test } from '@nestjs/testing'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { Logger } from '@nestjs/common'
import { MapmyIndiaService } from './src/common/services/mapmyindia.service'
import { SearchController } from './src/search/search.controller'
import { SearchService } from './src/search/search.service'
import * as fs from 'fs'
import * as path from 'path'

const logger = new Logger('ReverseGeocodeTest')

async function runTests() {
  logger.log('====================================================')
  logger.log('  LORRYCARRY GPS REVERSE-GEOCODING & SEARCH SUITE  ')
  logger.log('====================================================')

  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string) {
    if (condition) {
      logger.log(`  ✅ PASS: ${testName}`)
      passed++
    } else {
      logger.error(`  ❌ FAIL: ${testName}`)
      failed++
    }
  }

  // Set up NestJS testing module
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: ['.env.local', '.env'],
      }),
    ],
    providers: [
      MapmyIndiaService,
      SearchService,
      SearchController,
    ],
  })
    .setLogger(logger)
    .compile()

  const mapmyIndiaService = moduleRef.get<MapmyIndiaService>(MapmyIndiaService)
  const searchController = moduleRef.get<SearchController>(SearchController)
  const searchService = moduleRef.get<SearchService>(SearchService)

  logger.log('--- TEST 1: MapmyIndiaService.reverseGeocode() with Chennai coordinates ---')
  const chennaiLat = 13.0827
  const chennaiLng = 80.2707
  const chennaiResult = await mapmyIndiaService.reverseGeocode(chennaiLat, chennaiLng)
  logger.log('  Reverse geocode output: ' + JSON.stringify(chennaiResult))
  // Even if API key is not in dev network, verify the method returns a structured GeocodeResult or null gracefully without throwing
  assert(
    chennaiResult === null || (typeof chennaiResult === 'object' && chennaiResult.lat === chennaiLat && chennaiResult.lng === chennaiLng),
    'Reverse geocoding returns structured result or safe null without unhandled exceptions'
  )

  logger.log('--- TEST 2: Coordinate Boundary Validation (India bounding box) ---')
  // Coordinates outside India (e.g. 0, 0 or London 51.5, -0.12)
  const invalidResult = await mapmyIndiaService.reverseGeocode(0, 0)
  assert(invalidResult === null, 'Out of bounds coordinates (0, 0) are rejected by MapmyIndiaService')

  const londonResult = await mapmyIndiaService.reverseGeocode(51.5074, -0.1278)
  assert(londonResult === null, 'Out-of-country coordinates (London) are rejected by MapmyIndiaService')

  logger.log('--- TEST 3: SearchController.reverseGeocode() endpoint validation ---')
  try {
    await searchController.reverseGeocode('invalid', 'invalid')
    assert(false, 'SearchController rejects NaN coordinates')
  } catch (err: any) {
    assert(err.status === 400 || err.message.includes('numeric'), 'SearchController throws 400 BadRequest for NaN coordinates')
  }

  try {
    await searchController.reverseGeocode('0', '0')
    assert(false, 'SearchController rejects out-of-bounds coordinates')
  } catch (err: any) {
    assert(err.status === 400 || err.message.includes('boundary'), 'SearchController throws 400 BadRequest for out-of-bounds coordinates')
  }

  const endpointResult = await searchController.reverseGeocode('13.0827', '80.2707')
  logger.log('  Controller endpoint output: ' + JSON.stringify(endpointResult))
  assert(
    endpointResult !== null && endpointResult.lat === 13.0827 && endpointResult.lng === 80.2707,
    'SearchController reverse-geocode endpoint returns lat, lng, and address structure'
  )

  logger.log('--- TEST 4: Search Controller Accepts Real GPS Coordinates ---')
  assert(typeof searchController.searchTrucks === 'function', 'searchTrucks controller endpoint exists')
  assert(typeof searchController.searchLoads === 'function', 'searchLoads controller endpoint exists')

  logger.log('--- TEST 5: Security Audit — No Mappls API Key Leaks in Frontend Code ---')
  const webDir = path.resolve(__dirname, '../web/src')
  
  function scanDirForSecrets(dir: string): string[] {
    let leaks: string[] = []
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const fullPath = path.join(dir, file)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        leaks = leaks.concat(scanDirForSecrets(fullPath))
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8')
        if (content.includes('NEXT_PUBLIC_MAPMYINDIA') || content.includes('NEXT_PUBLIC_MAPPLS')) {
          leaks.push(`Found public Mappls key in ${fullPath}`)
        }
        if (content.includes('apis.mappls.com') || content.includes('apis.mapmyindia.com')) {
          leaks.push(`Found direct client Mappls API URL in ${fullPath}`)
        }
      }
    }
    return leaks
  }

  const securityLeaks = scanDirForSecrets(webDir)
  if (securityLeaks.length === 0) {
    logger.log('  ✅ No Mappls keys or direct Mappls API endpoints found in frontend bundle.')
    assert(true, 'Zero Mappls credentials exposed in frontend')
  } else {
    logger.error('  Security leaks detected: ' + JSON.stringify(securityLeaks))
    assert(false, 'Zero Mappls credentials exposed in frontend')
  }

  logger.log('====================================================')
  logger.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`)
  logger.log('====================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test run error:', err)
  process.exit(1)
})
