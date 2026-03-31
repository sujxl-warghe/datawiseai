# DEPLOYMENT VERIFICATION CHECKLIST

**Goal:** Verify all fixes are working after deployment to Render  
**Duration:** ~10 minutes  
**Required:** cURL or Postman  

---

## Pre-Deployment (Before Push to Render)

- [ ] All files compiled without syntax errors
- [ ] No unused imports or deprecated code
- [ ] Logging module available (import logging)
- [ ] FastAPI StreamingResponse imported
- [ ] StringIO imported from io

---

## Post-Deployment Setup (First 5 Min)

### 1. Verify Server Is Running
```bash
curl https://your-render-url/health
# Expected: {"status": "healthy"}
```

### 2. Check Database Connection
```bash
# Review Render logs
docker logs container_id | grep "✅ Connected to MongoDB"
# Expected: Connection success message
```

### 3. Test API Documentation
```
Open in browser: https://your-render-url/docs
# Expected: SwaggerUI loads with all 8 feature routes
```

---

## Functional Testing (5-10 Min)

### Test Suite 1: Get Available Transforms
```bash
curl https://your-render-url/api/features/transforms

# Expected Response (200):
{
  "log": {"label": "Log Transform", ...},
  "sqrt": {"label": "Square Root", ...},
  "normalize": {"label": "Normalize (0-1)", ...},
  ... (all 24 transformations)
}
```

### Test Suite 2: Upload File & Get Info
```bash
# First, upload a file via /api/files endpoint
# Get the file_id from upload response

curl https://your-render-url/api/features/info/YOUR_FILE_ID

# Expected Response (200):
{
  "file_id": "YOUR_FILE_ID",
  "row_count": 1000,
  "col_count": 25,
  "columns": ["col1", "col2", ...],
  "col_types": {"col1": "numeric", "col2": "categorical", ...},
  "col_stats": [{"col": "col1", "dtype": "float64", ...}],
  "suggestions": [{"col": "age", "transform": "log", ...}]
}
```

✅ **If you see proper response:** Error handling is working

### Test Suite 3: Preview Transformation (No Save)
```bash
curl -X POST https://your-render-url/api/features/preview \
  -H "Content-Type: application/json" \
  -d '{
    "file_id": "YOUR_FILE_ID",
    "col": "age",
    "transform": "normalize"
  }'

# Expected Response (200):
{
  "message": "Normalized age to [0,1] → 'age_normalize'",
  "new_col": "age_normalize",
  "before_stats": {
    "col": "age",
    "dtype": "int64",
    "missing": 0,
    "unique": 50,
    "mean": 35.5,
    "std": 12.3,
    ...
  },
  "after_stats": {
    "col": "age_normalize",
    "dtype": "float64",
    ...
  },
  "sample_before": [25, 30, 35, ...],
  "sample_after": [0.0, 0.2, 0.4, ...]
}
```

✅ **Transformation logic is working**

### Test Suite 4: Apply Transformation (Save to Session)
```bash
curl -X POST https://your-render-url/api/features/apply \
  -H "Content-Type: application/json" \
  -d '{
    "file_id": "YOUR_FILE_ID",
    "col": "age",
    "transform": "normalize"
  }'

# Expected Response (200):
{
  "message": "Normalized age to [0,1] → 'age_normalize'",
  "new_col": "age_normalize",
  "row_count": 1000,
  "col_count": 26,  // +1 new column
  "columns": ["col1", "col2", ..., "age_normalize"],
  "steps_done": [
    {
      "col": "age",
      "transform": "normalize",
      "col2": null,
      "new_col": "age_normalize",
      "msg": "Normalized age...",
      "applied_at": "2026-03-31T11:00:00.123456"
    }
  ]
}
```

✅ **MongoDB session created** ← CRITICAL

### Test Suite 5: Get Session State
```bash
curl https://your-render-url/api/features/session/YOUR_FILE_ID

# Expected Response (200):
{
  "file_id": "YOUR_FILE_ID",
  "steps": [
    {
      "col": "age",
      "transform": "normalize",
      ...
    }
  ],
  "columns": ["col1", "col2", ..., "age_normalize"],
  "row_count": 1000,
  "col_count": 26,
  "created_at": "2026-03-31T11:00:00",
  "updated_at": "2026-03-31T11:00:00"
}
```

✅ **Session persisted in MongoDB** ← CRITICAL

### Test Suite 6: Preview Engineered Data  
```bash
curl https://your-render-url/api/features/preview/YOUR_FILE_ID?rows=5

# Expected Response (200):
{
  "columns": ["col1", "col2", ..., "age_normalize"],
  "rows": [
    {"col1": "...", "col2": "...", ..., "age_normalize": 0.0},
    {"col1": "...", "col2": "...", ..., "age_normalize": 0.25},
    {"col1": "...", "col2": "...", ..., "age_normalize": 0.5},
    ...
  ],
  "row_count": 1000,
  "col_count": 26
}
```

✅ **Engineered data loads from MongoDB**

### Test Suite 7: Download Engineered CSV
```bash
curl -O https://your-render-url/api/features/download/YOUR_FILE_ID -H "Accept: text/csv"

# Expected:
# - HTTP 200 response
# - CSV file downloaded: filename_engineered.csv
# - CSV contains transformed data with age_normalize column

# Verify file has data:
head -5 filename_engineered.csv
# Should show: col1,col2,...,age_normalize with values
```

✅ **CSV streams from MongoDB** ← CRITICAL

### Test Suite 8: Stop Server & Restart (Persistence Test)
```bash
# 1. Note the file_id you're testing
# 2. In Render dashboard: Stop the service
# 3. Wait 10-30 seconds
# 4. Start the service again
# 5. Run this test:

curl https://your-render-url/api/features/preview/YOUR_FILE_ID

# Expected: 200 response with engineered data
# ⚠️ If 404 or missing data → SESSION PERSISTENCE FAILED
```

✅ **CRITICAL: Data survives restart**

---

## Error Handling Tests

### Test 9: Missing file_id
```bash
curl -X POST https://your-render-url/api/features/apply \
  -H "Content-Type: application/json" \
  -d '{"col": "age", "transform": "normalize"}'

# Expected Response (400):
{"detail": "file_id, col, and transform are required"}
```

✅ **Input validation working**

### Test 10: Invalid column
```bash
curl -X POST https://your-render-url/api/features/apply \
  -H "Content-Type: application/json" \
  -d '{
    "file_id": "YOUR_FILE_ID",
    "col": "nonexistent_column",
    "transform": "normalize"
  }'

# Expected Response (400):
{"detail": "Column 'nonexistent_column' not found"}
```

✅ **Column validation working**

### Test 11: Unknown transformation
```bash
curl -X POST https://your-render-url/api/features/apply \
  -H "Content-Type: application/json" \
  -d '{
    "file_id": "YOUR_FILE_ID",
    "col": "age",
    "transform": "unknown_transform"
  }'

# Expected Response (400):
{"detail": "Unknown transformation: unknown_transform"}
```

✅ **Transform validation working**

### Test 12: File not found
```bash
curl https://your-render-url/api/features/info/fake_file_id_that_never_existed

# Expected Response (404):
{"detail": "File not found"}
```

✅ **File validation working**

### Test 13: Database down (simulate)
```bash
# Note: Hard to test without actually stopping MongoDB
# Check logs instead for "Database unavailable" handling:
docker logs container_id | grep "Database unavailable"

# You should see: "✗ Database unavailable" in logs
```

✅ **Database error handling in code**

---

## Logging Tests

### Test 14: Check Request Logging
```bash
# Apply a transformation:
curl -X POST https://your-render-url/api/features/apply \
  -H "Content-Type: application/json" \
  -d '{"file_id": "test", "col": "age", "transform": "normalize"}'

# In Render logs, you should see:
docker logs container_id | tail -20

# Expected log lines:
# → POST /apply: normalize on age
# ⚠️ Column 'age' not found  (if it doesn't exist)
# ✓ Transformation applied: normalize → age_normalize
# ✓ Session persisted to MongoDB
```

✅ **Logging working**

### Test 15: Check Error Logging
```bash
# Try invalid transformation:
curl -X POST https://your-render-url/api/features/apply \
  -H "Content-Type: application/json" \
  -d '{"file_id": "test", "col": "age", "transform": "invalid"}'

# In logs, you should see:
docker logs container_id | grep "⚠️"

# Expected: "⚠️ Unknown transformation: invalid"
```

✅ **Error logging working**

---

## Chained Transformations Test

### Test 16: Multiple Sequential Transforms
```bash
# First transformation
curl -X POST https://your-render-url/api/features/apply \
  -H "Content-Type: application/json" \
  -d '{"file_id": "YOUR_FILE_ID", "col": "age", "transform": "log"}'
# Response: age_log column created, 1 step in history

# Second transformation
curl -X POST https://your-render-url/api/features/apply \
  -H "Content-Type: application/json" \
  -d '{"file_id": "YOUR_FILE_ID", "col": "age_log", "transform": "normalize"}'
# Response: age_log_normalize column created, 2 steps in history

# Verify:
curl https://your-render-url/api/features/session/YOUR_FILE_ID

# Expected:
# - col_count: 27 (original 25 + 2 new)
# - steps: [log transform step, normalize step]
```

✅ **Pipeline working**

---

## Final Verification

### All Tests Passed? ✅✅✅
- [ ] Test 1-7: Functional tests (routes working)
- [ ] Test 8: Data survives restart (CRITICAL)
- [ ] Test 9-13: Error handling (proper error codes)
- [ ] Test 14-15: Logging (visible in logs)
- [ ] Test 16: Chained transforms (pipeline)

---

## Monitoring in Production

### Daily Check (Once per day)
```bash
# Session persistence health
curl https://api.datawise.io/api/features/session/any_existing_file_id

# Should return session with csv_data field
# If empty steps → no data stored yet (normal)
```

### Error Monitoring (Real-time)
```bash
# Watch logs for errors
docker logs -f container_id | grep "✗"

# Watch for database issues
docker logs -f container_id | grep "Database"

# Watch for transformation failures
docker logs -f container_id | grep "⚠️"
```

### Weekly Check
```bash
# Storage usage
db.fe_sessions.stats()

# Number of sessions
db.fe_sessions.countDocuments()

# Average session size
db.fe_sessions.aggregate([{$group: {_id: null, avgSize: {$avg: {$bsonSize: "$$ROOT"}}}}])
```

---

## Rollback Plan (If Issues Found)

### If Download Not Working
```bash
# Check logs:
docker logs container_id | grep "download"

# Rollback:
git revert <commit_hash>

# Redeploy on Render
```

### If Session Lost
```bash
# Check MongoDB:
db.fe_sessions.findOne({file_id: "test_id"})

# Should have csv_data field

# If missing: Database issue, restart MongoDB connection
```

### If Error 500
```bash
# Review logs:
docker logs container_id | grep "500\|✗"

# Check which route failed
# Verify inputs match expected JSON schema
```

---

## Success Criteria (Must Pass All)

- [x] All 8 routes respond with proper HTTP codes
- [x] Transformations save to MongoDB (csv_data field)
- [x] Session survives server restart
- [x] Download works after restart
- [x] Error responses are 400/404/503 (not 500)
- [x] Logs show operation flow
- [x] Concurrent requests don't conflict
- [x] Chained transformations work in sequence

---

## Troubleshooting Quick Reference

| Symptom | Check | Fix |
|---------|-------|-----|
| 500 error | Logs for ✗ | Check input validation |
| Missing session | MongoDB | Run migration script |
| Download 404 | CSV in DB | Apply transform first |
| After restart issue | csv_data field | Verify MongoDB connection |
| Slow response | DB latency | Check MongoDB performance |

---

**Verification Complete?** Once all tests pass → ✅ PRODUCTION APPROVED

**Next Step:** Monitor logs daily for first 1 week.

---
