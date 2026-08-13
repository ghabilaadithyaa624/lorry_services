import { Test } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { MapmyIndiaService } from './src/common/services/mapmyindia.service'
import axios from 'axios'

// Set dummy API key so the service doesn't abort early
process.env.MAPPLS_API_KEY = 'dummy-key-for-testing'

// We will mock axios.get to simulate different network scenarios.
// To run the benchmark against different behaviors, we intercept the get calls.
let mockDelayPrimary = 0
let mockDelayFallback = 0
let primaryShouldFail = false
let fallbackShouldFail = false

let primaryCallCount = 0
let fallbackCallCount = 0

const originalGet = axios.get
axios.get = (url: string, config: any): Promise<any> => {
  const isPrimary = url.includes('apis.mappls.com')
  const delay = isPrimary ? mockDelayPrimary : mockDelayFallback
  const shouldFail = isPrimary ? primaryShouldFail : fallbackShouldFail

  if (isPrimary) {
    primaryCallCount++
  } else {
    fallbackCallCount++
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (shouldFail) {
        reject(new Error(`Simulated Error for ${isPrimary ? 'Primary' : 'Fallback'}`))
      } else {
        resolve({
          data: {
            results: [
              {
                lat: 13.0827,
                lng: 80.2707,
                formatted_address: isPrimary ? 'Primary Chennai Address' : 'Fallback Chennai Address',
                pincode: '600001',
                city: 'Chennai',
                state: 'Tamil Nadu',
              }
            ]
          }
        })
      }
    }, delay)

    // Handle abort signal if config.signal is provided
    if (config?.signal) {
      config.signal.addEventListener('abort', () => {
        clearTimeout(timeout)
        reject(new DOMException('Aborted', 'AbortError'))
      })
    }
  })
}

async function runBenchmark() {
  console.log('====================================================')
  console.log('  MAPMYINDIA SERVICE HEDGED REQUEST BENCHMARK      ')
  console.log('====================================================\n')

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: ['.env.local', '.env'],
      }),
    ],
    providers: [MapmyIndiaService],
  }).compile()

  const service = moduleRef.get<MapmyIndiaService>(MapmyIndiaService)

  async function testScenario(
    name: string,
    primaryDelay: number,
    fallbackDelay: number,
    failPrimary: boolean,
    failFallback: boolean
  ) {
    mockDelayPrimary = primaryDelay
    mockDelayFallback = fallbackDelay
    primaryShouldFail = failPrimary
    fallbackShouldFail = failFallback
    primaryCallCount = 0
    fallbackCallCount = 0

    const start = Date.now()
    const result = await service.reverseGeocode(13.0827, 80.2707)
    const duration = Date.now() - start

    console.log(`🎬 Scenario: ${name}`)
    console.log(`   - Config: Primary delay=${primaryDelay}ms (fail=${failPrimary}), Fallback delay=${fallbackDelay}ms (fail=${failFallback})`)
    console.log(`   - Result Address: ${result?.formattedAddress || 'null'}`)
    console.log(`   - Primary Calls: ${primaryCallCount}, Fallback Calls: ${fallbackCallCount}`)
    console.log(`   - Execution Time: ${duration}ms\n`)
    return duration
  }

  // Scenario 1: Primary is healthy and fast
  const t1 = await testScenario('Primary Healthy & Fast', 150, 150, false, false)

  // Scenario 2: Primary is extremely slow (hangs/times out), fallback is fast
  const t2 = await testScenario('Primary Slow (Hanging), Fallback Fast', 5000, 150, false, false)

  // Scenario 3: Primary fails instantly, fallback is healthy
  const t3 = await testScenario('Primary Fails Instantly, Fallback Healthy', 20, 150, true, false)

  console.log('====================================================')
  console.log('  BENCHMARK COMPLETED')
  console.log('====================================================\n')
}

runBenchmark().catch((err) => {
  console.error('Benchmark error:', err)
  process.exit(1)
})
