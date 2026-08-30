'use server';

import { db } from '@/lib/db';

export async function getUsers() {
  try {
    const [rows] = await db.query('SELECT * FROM users');
    return { success: true, data: rows };
  } catch (error) {
    console.error('Database query failed:', error);
    return { success: false, error: 'Failed to fetch users' };
  }
}