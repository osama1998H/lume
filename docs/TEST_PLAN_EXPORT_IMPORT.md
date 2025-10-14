# Data Export/Import Feature Test Plan

## Overview
This document outlines the testing procedures for the newly implemented data export/import functionality in the Lume application.

## Feature Branch
`feature/data-import-export`

## Implementation Summary
- **Export Format**: JSON (CSV marked as TODO for future implementation)
- **Import Strategies**: merge (default), replace, skip_duplicates
- **Data Included**: All time entries, app usage, categories, tags, pomodoro sessions, productivity goals, goal progress, and all relationship mappings

## Automated Tests Completed ✅

### 1. Build Verification
- **Status**: ✅ PASSED
- **Details**: Application builds successfully with no TypeScript compilation errors
- **Command**: `npm run build`
- **Result**: All modules compiled successfully

### 2. Runtime Initialization
- **Status**: ✅ PASSED
- **Details**: Application starts and initializes all services without errors
- **Command**: `npm start`
- **Result**:
  - Database initialized successfully
  - All services (Notification, Goals, Categories, Activity tracking, Pomodoro) initialized
  - No runtime errors in console

## Manual Testing Procedures

### Test 1: Export Functionality

#### Prerequisites
- Application is running with some sample data (time entries, categories, tags, etc.)

#### Steps
1. Launch the application: `npm start`
2. Navigate to Settings page (gear icon in sidebar)
3. Scroll to "Data Management" section
4. Click the "Export" button under "Export Data"
5. System save dialog should appear
6. Choose a location and save the file (default name: `lume-data-export-YYYY-MM-DD-timestamp.json`)
7. Verify success toast notification appears: "Data exported successfully!"

#### Expected Results
- ✅ Save dialog appears with correct default filename
- ✅ File is created at the chosen location
- ✅ File is valid JSON format
- ✅ File contains all expected data structure:
  ```json
  {
    "version": "2.5.4",
    "schemaVersion": 1,
    "exportDate": "2025-...",
    "tables": {
      "timeEntries": [...],
      "appUsage": [...],
      "categories": [...],
      "tags": [...],
      "pomodoroSessions": [...],
      "productivityGoals": [...],
      "goalProgress": [...],
      "appCategoryMappings": [...],
      "domainCategoryMappings": [...],
      "timeEntryTags": [...],
      "appUsageTags": [...],
      "pomodoroSessionTags": [...],
      "productivityGoalTags": [...]
    }
  }
  ```
- ✅ Toast notification shows success message

#### Test Data Validation
Open the exported JSON file and verify:
1. `version` matches current app version (2.5.4)
2. `schemaVersion` is 1
3. `exportDate` is a valid ISO timestamp
4. All tables arrays are present (even if empty)
5. Data matches what's visible in the app

---

### Test 2: Import Functionality - Merge Strategy (Default)

#### Prerequisites
- Have an exported JSON file from Test 1
- Application running with existing data

#### Steps
1. Navigate to Settings page
2. Scroll to "Data Management" section
3. Click the "Import" button under "Import Data"
4. System open dialog should appear
5. Select the exported JSON file
6. Click "Open"
7. Wait for import to complete

#### Expected Results
- ✅ Open dialog appears accepting .json files
- ✅ Import process completes successfully
- ✅ Success toast appears: "Successfully imported X records!"
- ✅ Application reloads automatically after 1.5 seconds
- ✅ Imported data is merged with existing data (no duplicates for unique records)
- ✅ Existing records are preserved
- ✅ New records from import file are added

---

### Test 3: Import Validation - Invalid File

#### Prerequisites
- Create an invalid JSON file (e.g., `invalid.json` with malformed JSON or wrong structure)

#### Steps
1. Navigate to Settings page
2. Click the "Import" button
3. Select the invalid JSON file
4. Click "Open"

#### Expected Results
- ✅ Error toast appears with appropriate error message
- ✅ No data is imported
- ✅ Application remains stable
- ✅ Existing data is not affected

---

### Test 4: Import Validation - Incompatible Schema Version

#### Prerequisites
- Create a JSON file with `schemaVersion: 2` (or higher)

#### Steps
1. Modify an exported JSON file to set `schemaVersion: 2`
2. Try to import the modified file

#### Expected Results
- ✅ Error toast appears: "Incompatible schema version: 2"
- ✅ No data is imported
- ✅ Application remains stable

---

### Test 5: Export with Empty Database

#### Prerequisites
- Fresh installation or cleared database

#### Steps
1. Export data from empty/minimal database

#### Expected Results
- ✅ Export succeeds
- ✅ JSON file created with empty arrays for tables
- ✅ Metadata (version, schemaVersion, exportDate) is present

---

### Test 6: Import with Empty Database

#### Prerequisites
- Fresh installation or cleared database
- Exported JSON file with data

#### Steps
1. Import data into empty database

#### Expected Results
- ✅ All data imports successfully
- ✅ Record count in toast matches imported records
- ✅ All categories, tags, and relationships are restored
- ✅ Application shows all imported data correctly

---

### Test 7: Language Support

#### Steps
1. Test export/import in English language
2. Change language to Arabic
3. Test export/import in Arabic

#### Expected Results
- ✅ English: All messages display correctly
  - "Data exported successfully!"
  - "Successfully imported X records!"
  - "Failed to export/import..." error messages
- ✅ Arabic: All messages display correctly in Arabic
  - "تم تصدير البيانات بنجاح!"
  - "تم استيراد X سجل بنجاح!"
  - Error messages in Arabic

---

### Test 8: Large Dataset Performance

#### Prerequisites
- Database with substantial data (100+ time entries, 50+ categories, etc.)

#### Steps
1. Export large dataset
2. Import large dataset

#### Expected Results
- ✅ Export completes in reasonable time (< 5 seconds)
- ✅ Import completes in reasonable time (< 10 seconds)
- ✅ No performance degradation
- ✅ All data imported correctly

---

## Edge Cases to Test

### 1. File System Permissions
- Test export when user cancels save dialog
- Test export to read-only location (should fail gracefully)
- Test import when user cancels open dialog

### 2. Data Integrity
- Test that tag relationships are preserved after import
- Test that category mappings are preserved
- Test that timestamps are preserved correctly
- Test that foreign key relationships are maintained

### 3. Error Handling
- Test with corrupted JSON file
- Test with missing required fields in JSON
- Test with extra unknown fields in JSON (should be ignored)

---

## Known Limitations

1. **CSV Format**: Not yet implemented (marked as TODO)
2. **Import Strategy UI**: Currently hardcoded to 'merge' strategy in Settings.tsx
   - Future enhancement: Add UI to select strategy (merge/replace/skip_duplicates)
3. **Progress Indication**: No progress bar for large imports/exports
   - Future enhancement: Add progress indicator for operations > 2 seconds

---

## Testing Checklist

- [ ] Test 1: Export Functionality
- [ ] Test 2: Import Functionality - Merge Strategy
- [ ] Test 3: Import Validation - Invalid File
- [ ] Test 4: Import Validation - Incompatible Schema
- [ ] Test 5: Export with Empty Database
- [ ] Test 6: Import with Empty Database
- [ ] Test 7: Language Support (English & Arabic)
- [ ] Test 8: Large Dataset Performance
- [ ] Edge Case: File System Permissions
- [ ] Edge Case: Data Integrity
- [ ] Edge Case: Error Handling

---

## Regression Testing

After completing the above tests, verify that existing functionality still works:
- [ ] Time tracking continues to work
- [ ] Categories management works
- [ ] Tags management works
- [ ] Goals and progress tracking works
- [ ] Analytics and reports display correctly
- [ ] Settings changes persist correctly

---

## Test Results

**Build & Compilation**: ✅ PASSED (2025-10-09)
**Runtime Initialization**: ✅ PASSED (2025-10-09)
**Manual GUI Tests**: ⏳ PENDING (Requires manual testing)

---

## Notes

- All TypeScript type checking passed
- All IPC handlers registered successfully
- Database methods implemented with proper error handling
- Transaction-based imports ensure data integrity
- Comprehensive validation before import operations
