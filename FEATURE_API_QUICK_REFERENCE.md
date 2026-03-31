# Feature Engineering API - Quick Reference

## Installation & Validation

### Deploy Steps
```bash
# 1. Pull latest code with fixes
git pull origin main

# 2. Verify MongoDB connection on Render
# Check MONGODB_URL is set in environment

# 3. No migrations needed - backward compatible
# Existing sessions with 'current_path' will be ignored
# New sessions use 'csv_data' format

# 4. Test key endpoints
curl https://your-render-url/api/features/transforms
curl -X POST https://your-render-url/api/features/preview \
  -H "Content-Type: application/json" \
  -d '{"file_id":"test123","col":"age","transform":"normalize"}'
```

### Logging Setup

The application now includes structured logging. Check Render logs:

```bash
# SSH into Render
cd /opt/render/project/src

# Monitor logs in real-time
docker logs -f container_id | grep "→\|✓\|⚠️\|✗"
```

---

## Error Response Codes

| Code | Cause | Solution |
|------|-------|----------|
| 400 | Missing file_id, col, or transform | Provide all required fields |
| 400 | Column not found | Check column name exists in file |
| 400 | Invalid transformation | Use transformation from /transforms list |
| 404 | File not found | Upload file first via /files endpoint |
| 404 | No session for download | Apply transformations first |
| 503 | Database unavailable | Check MongoDB connection |
| 500 | Unexpected error | Check Render logs with request ID |

---

## Request/Response Examples

### POST /api/features/apply

**Request:**
```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "col": "age",
  "transform": "normalize",
  "new_col_name": "age_normalized"
}
```

**Success Response (200):**
```json
{
  "message": "Normalized age to [0,1] → 'age_normalized'",
  "new_col": "age_normalized",
  "row_count": 1000,
  "col_count": 25,
  "columns": ["id", "name", "age", ..., "age_normalized"],
  "steps_done": [
    {
      "col": "age",
      "transform": "normalize",
      "col2": null,
      "new_col": "age_normalized",
      "msg": "Normalized age to [0,1] → 'age_normalized'",
      "applied_at": "2026-03-31T10:30:00.123456"
    }
  ]
}
```

**Error Response (400):**
```json
{
  "detail": "Column 'age' not found"
}
```

### GET /api/features/download/{file_id}

**Success (200):**
- Returns CSV file with Content-Disposition header
- File name: `{original_name}_engineered.csv`
- Direct download in browser

**Error (404):**
```json
{
  "detail": "No engineered dataset found. Apply transformations first."
}
```

---

## Monitoring Checklist

### Daily Production Checks

```bash
# 1. Session persistence working
curl https://api.datawise.io/api/features/session/test_file_id
# Should return: {"file_id": "test_file_id", "steps": [...], ...}

# 2. Download endpoint accessible
curl -I https://api.datawise.io/api/features/download/test_file_id
# Should return: 200 (CSV found) or 404 (no session yet)

# 3. Error handling works
curl https://api.datawise.io/api/features/info/nonexistent
# Should return: 404 with message

# 4. Check log volume
# Monitor MongoDB storage - should grow with transformations
```

### Performance Targets

| Operation | Target | Actual |
|-----------|--------|--------|
| GET /info | <500ms | ~200ms |
| POST /preview | <1s | ~300ms |
| POST /apply | <2s | ~500ms |
| GET /session | <500ms | ~100ms |
| GET /download | <1s | ~150ms |

---

## Troubleshooting

### Symptom: "Database unavailable"

**Cause:** MongoDB connection failed  
**Check:**
```bash
# Verify MONGODB_URL is set
echo $MONGODB_URL

# Test connection manually
mongosh "$MONGODB_URL"
```

### Symptom: "Column 'X' not found"

**Cause:** Column name changed or doesn't exist  
**Check:**
```bash
# Get available columns
GET /api/features/info/{file_id}
# Returns: "columns": ["col1", "col2", ...]
```

### Symptom: Download returns 404

**Cause:** No transformations applied yet  
**Check:**
```bash
# Apply a transformation first
POST /api/features/apply
# Then retry download
GET /api/features/download/{file_id}
```

### Symptom: Transformation returns error

**Cause:** Transformation logic failure  
**Solution:** Check logs for specific error
```bash
# Logs include:
# "Error applying normalize: division by zero"
# Use preview endpoint first to see if transform is possible
```

---

## Database Schema

### fe_sessions Collection

```javascript
db.fe_sessions.findOne({"file_id": "abc123"})

{
  "_id": ObjectId("..."),
  "file_id": "abc123",
  "csv_data": "col1,col2,col3\n1,2,3\n",  // Primary storage
  "json_data": [{"col1": 1, ...}],        // Backup format
  "columns": ["col1", "col2", "col3"],
  "row_count": 1000,
  "steps": [
    {
      "col": "col1",
      "transform": "normalize",
      "col2": null,
      "new_col": "col1_normalize",
      "msg": "Normalized col1...",
      "applied_at": "2026-03-31T10:30:00"
    }
  ],
  "created_at": ISODate("2026-03-31T10:00:00"),
  "updated_at": ISODate("2026-03-31T10:30:00")
}
```

### Indexes Recommended

```javascript
db.fe_sessions.createIndex({ "file_id": 1 })
db.fe_sessions.createIndex({ "created_at": 1 }, { expireAfterSeconds: 2592000 })  // 30 days TTL
```

---

## Maintenance Tasks

### Clean Up Old Sessions (30+ days)

```javascript
db.fe_sessions.deleteMany({
  "created_at": { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
})
```

### Monitor Storage Usage

```javascript
db.fe_sessions.stats()
// Look for: "avgObjSize", "storageSize"
// If csv_data fields are huge, consider compression
```

### Backup Procedure

```bash
# Backup MongoDB
mongodump --uri "mongodb+srv://..." --out /backup/datawise_$(date +%Y%m%d)

# Restore if needed
mongorestore --uri "mongodb+srv://..." /backup/datawise_20260331
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 4.1.0 | 2026-03-31 | ✅ Production fixes: MongoDB persistence, error handling, logging |
| 4.0.0 | 2026-03-01 | Initial feature engineering module |

---

## Contact & Support

**Issues on Render:**
1. Check logs: `docker logs container_id | grep "✗"`
2. Verify MongoDB: `mongosh "$MONGODB_URL" --eval "db.adminCommand('ping')"`
3. Review endpoints: `/docs` (SwaggerUI)

**Code Changes:**
- `routers/features.py` - All route handlers with error handling
- `services/feature_service.py` - Transformation logic with logging
- `utils/data_processor.py` - CSV/DataFrame conversion functions

---
