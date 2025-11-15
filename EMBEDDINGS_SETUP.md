# Vector Embeddings Setup Guide

## ✅ What's Been Implemented

1. **Voyager SDK installed** (`voyageai` package)
2. **Embeddings utility** (`lib/embeddings.ts`) - Generates embeddings for listings
3. **Auto-generation on listing creation** - New listings automatically get embeddings
4. **Backfill API endpoint** - Generate embeddings for existing listings

## 🚀 Quick Start

### Step 1: Get Voyager API Key

1. Sign up at https://www.voyageai.com
2. Get your API key from the dashboard
3. Add it to your `.env.local`:

```env
VOYAGE_API_KEY=your-voyage-api-key-here
```

### Step 2: Generate Embeddings for Existing Listings

If you have existing listings without embeddings, use the backfill endpoint:

**Check status:**
```bash
curl http://localhost:3000/api/listings/backfill-embeddings
```

**Generate embeddings:**
```bash
curl -X POST http://localhost:3000/api/listings/backfill-embeddings
```

Or use the API in your browser:
- GET: `http://localhost:3000/api/listings/backfill-embeddings` - Check status
- POST: `http://localhost:3000/api/listings/backfill-embeddings` - Generate embeddings

### Step 3: Create Vector Search Index in MongoDB Atlas

1. Go to your MongoDB Atlas dashboard
2. Navigate to **Atlas Search** tab
3. Click **Create Search Index**
4. Choose **JSON Editor**
5. Use this configuration:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    }
  ]
}
```

**Important Notes:**
- `numDimensions: 1024` for `voyage-2` model (default)
- `numDimensions: 1536` for `voyage-large-2` model
- Adjust based on which Voyager model you're using
- The field name is `numDimensions` (not `dimensions`)
- The structure uses `fields` array with `type: "vector"` (not `knnVector`)

### Step 4: Verify Embeddings

After generating embeddings, you should see them in your MongoDB collection. Each listing document should have an `embedding` field with an array of numbers.

## 📝 How It Works

### Automatic Embedding Generation

When a new listing is created via `/api/listings/create`, the system:
1. Generates an embedding using Voyager API
2. Stores the embedding in the `embedding` field
3. The embedding is a 1024-dimensional vector (for `voyage-2`)

### Embedding Content

The embedding combines these fields from the listing:
- Name
- Description
- Full Description
- Category
- Company Profile (name & bio)

### Backfill Endpoint

The `/api/listings/backfill-embeddings` endpoint:
- **GET**: Returns status of embeddings (how many have/need embeddings)
- **POST**: Generates embeddings for all listings that don't have them

## 🔧 Usage in Code

### Generate Embedding for a Listing

```typescript
import { embedListing } from '@/lib/embeddings';

const embedding = await embedListing(listing);
```

### Generate Embedding for Custom Text

```typescript
import { generateEmbedding } from '@/lib/embeddings';

const embedding = await generateEmbedding('Your text here');
```

### Use Different Model

```typescript
const embedding = await generateEmbedding('Your text', 'voyage-large-2');
```

## 🎯 Next Steps: Vector Search

Once embeddings are generated and the index is created, you can implement vector search:

1. Create `lib/vector-search.ts` (see `MONGODB_ATLAS_VOYAGER_SETUP.md`)
2. Update `/api/ai/search/route.ts` to use vector search instead of passing all listings

## ⚠️ Troubleshooting

### "No vector embeddings were detected"

This means:
1. You haven't generated embeddings yet, OR
2. The embeddings field is empty/missing in your documents

**Solution:**
1. Make sure `VOYAGE_API_KEY` is set in `.env.local`
2. Run the backfill endpoint: `POST /api/listings/backfill-embeddings`
3. Verify embeddings exist in MongoDB before creating the index

### "VOYAGE_API_KEY not set"

Add the API key to your `.env.local` file:
```env
VOYAGE_API_KEY=your-key-here
```

### Embedding Generation Fails

- Check your Voyager API key is valid
- Verify you have credits/quota in your Voyager account
- Check the console logs for specific error messages

## 💰 Cost

Voyager embeddings are very affordable:
- **voyage-2**: $0.0001 per 1K tokens
- **voyage-large-2**: $0.0002 per 1K tokens

For a typical listing (~200-500 tokens), that's about $0.00002-0.00005 per listing.

## 📚 Resources

- **Voyager AI**: https://www.voyageai.com
- **Voyager Docs**: https://docs.voyageai.com
- **MongoDB Atlas Vector Search**: https://www.mongodb.com/docs/atlas/atlas-vector-search

