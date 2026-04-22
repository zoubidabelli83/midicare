// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
  try {
    // Parse form data
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' }, 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only images allowed.' }, 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Max 5MB allowed.' }, 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create safe filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${safeName}`;
    
    // Build paths
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars');
    const filePath = join(uploadDir, filename);

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    // Write file to disk
    await writeFile(filePath, buffer);

    // Return public URL
    const publicUrl = `/uploads/avatars/${filename}`;
    
    return NextResponse.json(
      { success: true, url: publicUrl, filename },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    // ✅ Log error for debugging
    console.error('🔥 Upload API Error:', {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
    });

    // ✅ ALWAYS return JSON, never HTML
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to upload image',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      }, 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }  // ← Critical!
      }
    );
  }
}

// ✅ Optional: Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' }, 
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
}