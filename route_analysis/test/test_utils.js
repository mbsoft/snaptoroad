// Test utilities for mobility route analysis

import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Test assertion helper
export function assertEqual (actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${expected}, but got ${actual}`)
  }
}

// Test assertion helper for floating point numbers
export function assertApproxEqual (actual, expected, tolerance = 0.01, message = '') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message} Expected ${expected} ± ${tolerance}, but got ${actual}`)
  }
}

// Test assertion helper for objects
export function assertObjectEqual (actual, expected, message = '') {
  const actualStr = JSON.stringify(actual, null, 2)
  const expectedStr = JSON.stringify(expected, null, 2)
  if (actualStr !== expectedStr) {
    throw new Error(`${message}\nExpected: ${expectedStr}\nActual: ${actualStr}`)
  }
}

// Create temporary test files
export function createTempFile (content, filename) {
  const tempPath = join(__dirname, 'temp', filename)
  const tempDir = dirname(tempPath)

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  fs.writeFileSync(tempPath, content)
  return tempPath
}

// Clean up temporary files
export function cleanupTempFiles () {
  const tempDir = join(__dirname, 'temp')
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

// Mock console.log to capture output
export function captureConsoleOutput (fn) {
  const originalLog = console.log
  const output = []

  console.log = (...args) => {
    output.push(args.join(' '))
  }

  try {
    fn()
  } finally {
    console.log = originalLog
  }

  return output.join('\n')
}

// Test runner
export function runTests (tests) {
  let passed = 0
  let failed = 0

  console.log('Running tests...\n')

  for (const [testName, testFn] of Object.entries(tests)) {
    try {
      testFn()
      console.log(`✅ ${testName}`)
      passed++
    } catch (error) {
      console.log(`❌ ${testName}: ${error.message}`)
      failed++
    }
  }

  console.log(`\nTest Results: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    process.exit(1)
  }
}

// Helper to test file existence
export function assertFileExists (filepath, message = '') {
  if (!fs.existsSync(filepath)) {
    throw new Error(`${message} File does not exist: ${filepath}`)
  }
}

// Helper to test file content
export function assertFileContains (filepath, expectedContent, message = '') {
  const content = fs.readFileSync(filepath, 'utf8')
  if (!content.includes(expectedContent)) {
    throw new Error(`${message} File does not contain expected content: ${expectedContent}`)
  }
}
