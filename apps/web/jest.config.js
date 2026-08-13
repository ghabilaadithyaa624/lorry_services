const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
}

module.exports = createJestConfig(customJestConfig)
