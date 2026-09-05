import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis;
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
function createPrismaClient() {
    if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = new PrismaClient();
    }
    return globalForPrisma.prisma;
}
export const prisma = new Proxy({}, {
    get(_target, prop, receiver) {
        const client = createPrismaClient();
        const value = Reflect.get(client, prop, receiver);
        return typeof value === 'function' ? value.bind(client) : value;
    },
    has(_target, prop) {
        return Reflect.has(createPrismaClient(), prop);
    },
});
// Re-export for convenience
export * from '@prisma/client';
//# sourceMappingURL=client.js.map