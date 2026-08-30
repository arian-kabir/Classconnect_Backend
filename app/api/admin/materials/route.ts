import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// GET: Fetch all materials with their categories
export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT m.material_id, m.title, m.file_url, m.file_size_bytes, m.created_at, 
             COALESCE(m.category_id, 2) AS category_id,
             COALESCE(c.category_name, 'Lecture Slides') AS category_name 
      FROM course_materials m
      LEFT JOIN material_categories c ON m.category_id = c.category_id
      ORDER BY m.created_at DESC
    `);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('❌ GET Materials Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Save direct URL OR upload file to Cloudinary & store in MySQL
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Option A: Save direct external link
    if (contentType.includes('application/json')) {
      const { title, file_url, category_id, course_id, uploaded_by } = await req.json();

      if (!file_url) {
        return NextResponse.json({ success: false, error: 'Link URL is required' }, { status: 400 });
      }

      const catId = Number(category_id) || 2;
      const courseId = Number(course_id) || 1;
      const userId = Number(uploaded_by) || 1;

      const [result]: any = await db.query(
        `INSERT INTO course_materials (course_id, category_id, title, file_url, uploaded_by, file_size_bytes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [courseId, catId, title || 'External Resource', file_url, userId, 0]
      );

      const [catRows]: any = await db.query(
        `SELECT category_name FROM material_categories WHERE category_id = ?`,
        [catId]
      );
      const categoryName = catRows[0]?.category_name || 'Lecture Slides';

      return NextResponse.json({
        success: true,
        material: {
          material_id: result.insertId,
          title: title || 'External Resource',
          file_url,
          file_size_bytes: 0,
          created_at: new Date().toISOString(),
          category_id: catId,
          category_name: categoryName,
        },
      });
    }

    // Option B: Handle File Upload
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const directLink = formData.get('direct_link') as string;
    const title = formData.get('title') as string;
    const categoryIdRaw = formData.get('category_id') as string;

    const categoryId = Number(categoryIdRaw) || 2;
    let finalFileUrl = directLink || '';

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Data = buffer.toString('base64');
      const fileUri = `data:${file.type || 'application/octet-stream'};base64,${base64Data}`;

      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isPdfOrImage = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);

      // Upload PDFs/images as 'image' resource type to support native inline browser rendering
      const resourceType = isPdfOrImage ? 'image' : 'raw';
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

      try {
        const uploadResult = await cloudinary.uploader.upload(fileUri, {
          folder: 'class_connect_materials',
          resource_type: resourceType,
          public_id: `${Date.now()}_${sanitizedFileName}`,
          use_filename: true,
        });

        finalFileUrl = uploadResult.secure_url;
      } catch (cloudErr: any) {
        console.error('❌ Cloudinary Upload Error:', cloudErr);
        throw new Error(cloudErr.message || 'Cloudinary upload failed');
      }
    }

    if (!finalFileUrl) {
      return NextResponse.json(
        { success: false, error: 'Please choose a file or enter a direct link.' },
        { status: 400 }
      );
    }

    const materialTitle = title || (file ? file.name : 'Class Resource');
    const fileSize = file ? file.size : 0;

    const [result]: any = await db.query(
      `INSERT INTO course_materials (course_id, category_id, title, file_url, uploaded_by, file_size_bytes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [1, categoryId, materialTitle, finalFileUrl, 1, fileSize]
    );

    const [catRows]: any = await db.query(
      `SELECT category_name FROM material_categories WHERE category_id = ?`,
      [categoryId]
    );
    const categoryName = catRows[0]?.category_name || 'Lecture Slides';

    return NextResponse.json({
      success: true,
      material: {
        material_id: result.insertId,
        title: materialTitle,
        file_url: finalFileUrl,
        file_size_bytes: fileSize,
        created_at: new Date().toISOString(),
        category_id: categoryId,
        category_name: categoryName,
      },
    });
  } catch (error: any) {
    console.error('❌ POST Materials Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}