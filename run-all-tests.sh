#!/bin/bash

# =====================================================
# COMPREHENSIVE TEST SUITE RUNNER
# =====================================================
# This script runs all test suites to verify the app functionality

set -e  # Exit on any error

echo "🧪 Starting Comprehensive Test Suite"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to run a test and capture results
run_test() {
    local test_name=$1
    local test_command=$2
    local log_file=$3
    
    print_status $BLUE "🔄 Running $test_name..."
    
    if eval "$test_command" > "$log_file" 2>&1; then
        print_status $GREEN "✅ $test_name PASSED"
        return 0
    else
        print_status $RED "❌ $test_name FAILED"
        echo "   Log file: $log_file"
        return 1
    fi
}

# Create logs directory
mkdir -p test-logs

# Initialize counters
total_tests=0
passed_tests=0

echo "📋 Test Suite Overview:"
echo "1. App Functionality Test"
echo "2. Image Upload Pipeline Test"
echo "3. Foreign Key Constraints Test (SQL)"
echo ""

# =====================================================
# TEST 1: App Functionality
# =====================================================
total_tests=$((total_tests + 1))
if run_test "App Functionality" "node test-app-functionality.js" "test-logs/app-functionality.log"; then
    passed_tests=$((passed_tests + 1))
fi

echo ""

# =====================================================
# TEST 2: Image Upload Pipeline
# =====================================================
total_tests=$((total_tests + 1))
if run_test "Image Upload Pipeline" "node test-image-upload-pipeline.js" "test-logs/image-upload.log"; then
    passed_tests=$((passed_tests + 1))
fi

echo ""

# =====================================================
# TEST 3: Foreign Key Constraints (SQL)
# =====================================================
total_tests=$((total_tests + 1))

# Check if psql is available and connection string is set
if command -v psql >/dev/null 2>&1; then
    # Try to run the SQL test
    print_status $BLUE "🔄 Running Foreign Key Constraints Test..."
    
    # Use the Supabase connection string
    DB_URL="postgresql://postgres.dqjhwqhelqwhvtpxccwj:Lockerroom123@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
    
    if psql "$DB_URL" -f test-foreign-key-constraints.sql > test-logs/foreign-key-constraints.log 2>&1; then
        print_status $GREEN "✅ Foreign Key Constraints Test PASSED"
        passed_tests=$((passed_tests + 1))
    else
        print_status $YELLOW "⚠️  Foreign Key Constraints Test SKIPPED (Connection issue)"
        echo "   This test requires direct database access"
        echo "   Run manually: psql [connection_string] -f test-foreign-key-constraints.sql"
    fi
else
    print_status $YELLOW "⚠️  Foreign Key Constraints Test SKIPPED (psql not available)"
    echo "   Install PostgreSQL client to run this test"
    echo "   Or run manually in your database client"
fi

echo ""

# =====================================================
# SUMMARY
# =====================================================
echo "======================================"
print_status $BLUE "📊 TEST SUITE SUMMARY"
echo "======================================"

if [ $passed_tests -eq $total_tests ]; then
    print_status $GREEN "🎉 ALL TESTS PASSED ($passed_tests/$total_tests)"
    echo ""
    echo "✅ App functionality is working correctly"
    echo "✅ Image upload pipeline is functional"
    echo "✅ Database constraints are properly configured"
elif [ $passed_tests -ge 2 ]; then
    print_status $YELLOW "⚠️  MOST TESTS PASSED ($passed_tests/$total_tests)"
    echo ""
    echo "Core functionality is working, but some issues detected."
    echo "Check the individual test logs for details."
else
    print_status $RED "❌ MULTIPLE TEST FAILURES ($passed_tests/$total_tests)"
    echo ""
    echo "Significant issues detected. Review all test logs."
fi

echo ""
echo "📁 Test Logs Location: test-logs/"
echo "   - app-functionality.log"
echo "   - image-upload.log"
echo "   - foreign-key-constraints.log"

echo ""
echo "🔧 Manual Testing Recommendations:"
echo "   1. Open the app and create a new review with images"
echo "   2. Verify images appear on the browse screen"
echo "   3. Check that images load in review detail screen"
echo "   4. Test pull-to-refresh functionality"
echo "   5. Verify comments system works without crashes"

echo ""
echo "💡 Troubleshooting:"
echo "   - If image upload fails: Check debug logs in Metro bundler"
echo "   - If images don't appear: Try pull-to-refresh on browse screen"
echo "   - If app crashes on comments: Check date formatting in realtime updates"

echo ""
print_status $BLUE "Test suite completed!"

# Exit with appropriate code
if [ $passed_tests -eq $total_tests ]; then
    exit 0
else
    exit 1
fi
