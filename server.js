import 'dotenv/config';
import express from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION || 'us-east-1';
const PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL ||
  `https://${BUCKET}.s3.${REGION}.amazonaws.com`;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Serve the photobooth UI
app.use(express.static(__dirname));

// Accept up to 8 MB base64 JSON bodies
app.use(express.json({ limit: '8mb' }));

// POST /upload  { image: "data:image/png;base64,..." }
// Returns       { url: "https://..." }
app.post('/upload', async (req, res) => {
  const { image } = req.body;
  if (!image || !image.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Missing or invalid image field' });
  }

  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const key = `portraits/${uuidv4()}.png`;

  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/png',
      // Remove the line below if your bucket is not set to public-read by default
      ACL: 'public-read',
    }));

    const url = `${PUBLIC_BASE_URL}/${key}`;
    console.log('Uploaded:', url);
    res.json({ url });
  } catch (err) {
    console.error('S3 upload failed:', err);
    res.status(500).json({ error: 'Upload failed', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Photo booth running → http://localhost:${PORT}`);
  if (!BUCKET) console.warn('⚠  AWS_S3_BUCKET not set — uploads will fail');
});
