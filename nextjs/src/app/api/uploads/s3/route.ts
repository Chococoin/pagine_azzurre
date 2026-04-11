import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { authOptions } from '@/lib/auth/config';

// Defensive trim: some env vars were copied into Vercel with trailing
// whitespace / newlines and the AWS SDK builds the hostname from region,
// so anything but a bare token breaks the request.
const env = (key: string, fallback = '') => (process.env[key] ?? fallback).trim();

const s3Client = new S3Client({
  region: env('AWS_REGION', 'eu-west-1'),
  credentials: {
    accessKeyId: env('S3_KEY_ID'),
    secretAccessKey: env('S3_ACCESS_KEY'),
  },
});

const BUCKET_NAME = env('S3_BUCKET_NAME', 'pagineazzurre2');

// POST /api/uploads/s3 - Upload file to S3
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json(
        { message: 'Nessun file caricato' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { message: 'Tipo file non supportato. Usa JPG, PNG, GIF o WebP.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: 'File troppo grande. Massimo 5MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to S3.
    // No ACL: AWS disabled object ACLs by default on new buckets since 2023.
    // Public read must be handled by a bucket policy on `pagineazzurre2`.
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    // Return region-aware S3 URL. The legacy global-style hostname
    // (`<bucket>.s3.amazonaws.com`) only resolves cleanly for us-east-1
    // buckets; for eu-west-3 it either 301-redirects or 403s depending
    // on the operation.
    const s3Region = env('AWS_REGION', 'eu-west-3');
    const s3Url = `https://${BUCKET_NAME}.s3.${s3Region}.amazonaws.com/${filename}`;

    return NextResponse.json({
      url: s3Url,
      filename,
    });
  } catch (error) {
    // Surface the actual AWS error so we can diagnose credentials, ACL,
    // or bucket-policy issues from the client-side toast.
    const detail =
      error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error('[uploads/s3] Upload failed:', detail);
    return NextResponse.json(
      { message: `Errore nel caricamento su S3 — ${detail}` },
      { status: 500 }
    );
  }
}
