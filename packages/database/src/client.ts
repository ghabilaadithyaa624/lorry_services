import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Lazily instantiate the Prisma client on first property access.
 *
 * `new PrismaClient()` eagerly loads the native query engine, which fails in
 * environments where the engine binary is unavailable (e.g. unit tests that
 * fully mock the client, or restricted CI sandboxes). Wrapping construction in
 * a Proxy defers engine loading until a query is actually issued, so importing
 * this module — as spec files do via `jest.requireActual` to read enums — never
 * touches the engine. Runtime behaviour for real queries is unchanged.
 */
function createPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient()
  }
  return globalForPrisma.prisma
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = createPrismaClient()
    const value = Reflect.get(client as object, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
  has(_target, prop) {
    return Reflect.has(createPrismaClient() as object, prop)
  },
})

// Re-export for convenience
export * from '@prisma/client'
