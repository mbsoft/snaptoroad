// Main test runner for mobility route analysis

import { runAllTests } from './test_analysis.js';
import { runPDFTests } from './test_pdf.js';
import { cleanupTempFiles } from './test_utils.js';

async function runAllTestSuites() {
    console.log('🚀 Starting Mobility Route Analysis Test Suite\n');
    console.log('=' .repeat(60));
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    
    try {
        // Run analysis tests
        console.log('\n📊 Running Analysis Tests...');
        console.log('-'.repeat(40));
        runAllTests();
        passedTests += 9; // Number of analysis tests
        totalTests += 9;
        
        // Run PDF tests
        console.log('\n📄 Running PDF Generation Tests...');
        console.log('-'.repeat(40));
        await runPDFTests();
        passedTests += 4; // Number of PDF tests
        totalTests += 4;
        
        console.log('\n' + '='.repeat(60));
        console.log('🎉 ALL TESTS PASSED!');
        console.log(`📈 Test Summary: ${passedTests}/${totalTests} tests passed`);
        console.log('='.repeat(60));
        
    } catch (error) {
        console.log('\n' + '='.repeat(60));
        console.log('❌ TEST SUITE FAILED');
        console.log(`📈 Test Summary: ${passedTests}/${totalTests} tests passed`);
        console.log(`💥 Error: ${error.message}`);
        console.log('='.repeat(60));
        
        // Clean up any temporary files
        cleanupTempFiles();
        
        process.exit(1);
    } finally {
        // Always clean up
        cleanupTempFiles();
    }
}

// Run all tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTestSuites().catch(error => {
        console.error('Test suite execution failed:', error);
        process.exit(1);
    });
}

export { runAllTestSuites }; 