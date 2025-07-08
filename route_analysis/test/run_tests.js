#!/usr/bin/env node

/**
 * Test runner for route analysis module
 * This script runs all test files and provides a summary
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const testFiles = [
  'test_analysis.js',
  'test_pdf.js'
]

console.log('🚀 Starting Route Analysis Test Suite...\n')

let passedTests = 0
let failedTests = 0
const results = []

// Run each test file
for (const testFile of testFiles) {
  const testPath = path.join(process.cwd(), 'test', testFile)

  if (!fs.existsSync(testPath)) {
    console.log(`❌ Test file not found: ${testFile}`)
    failedTests++
    results.push({ file: testFile, status: 'NOT_FOUND' })
    continue
  }

  try {
    console.log(`📋 Running ${testFile}...`)
    execSync(`node ${testPath}`, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
    console.log(`✅ ${testFile} passed\n`)
    passedTests++
    results.push({ file: testFile, status: 'PASSED' })
  } catch (error) {
    console.log(`❌ ${testFile} failed\n`)
    failedTests++
    results.push({ file: testFile, status: 'FAILED', error: error.message })
  }
}

// Print summary
console.log('📊 Test Summary:')
console.log('================')
console.log(`Total Tests: ${testFiles.length}`)
console.log(`Passed: ${passedTests}`)
console.log(`Failed: ${failedTests}`)
console.log(`Success Rate: ${Math.round((passedTests / testFiles.length) * 100)}%`)

// Print detailed results
console.log('\n📋 Detailed Results:')
console.log('===================')
results.forEach(result => {
  const status = result.status === 'PASSED'
    ? '✅'
    : result.status === 'FAILED'
      ? '❌'
      : '⚠️'
  console.log(`${status} ${result.file}: ${result.status}`)
  if (result.error) {
    console.log(`   Error: ${result.error}`)
  }
})

// Exit with appropriate code
if (failedTests > 0) {
  console.log('\n❌ Some tests failed. Exiting with code 1.')
  process.exit(1)
} else {
  console.log('\n🎉 All tests passed!')
  process.exit(0)
}
