import { NextResponse } from 'next/server';
import { seedDemoBuses, clearDemoData, hasDemoBuses } from '@/lib/seedData';

export async function POST() {
  // Optionally protect seeding in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Seeding is disabled in production.' },
      { status: 403 }
    );
  }

  try {
    const alreadyHasData = await hasDemoBuses();
    if (alreadyHasData) {
      const result = await seedDemoBuses(); // will early‑exit, but returns useful flags
      return NextResponse.json({
        success: true,
        message: 'Buses already exist. Skipped creating duplicates.',
        ...result,
      });
    }

    const result = await seedDemoBuses();
    return NextResponse.json({
      success: true,
      message: `Seeded ${result.created} demo buses.`,
      ...result,
    });
  } catch (error) {
    console.error('[api/seed] POST error', error);
    const message =
      error instanceof Error ? error.message : 'Failed to seed demo data.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Clearing demo data is disabled in production.' },
      { status: 403 }
    );
  }

  try {
    await clearDemoData();
    return NextResponse.json({
      success: true,
      message: 'Cleared all demo buses.',
    });
  } catch (error) {
    console.error('[api/seed] DELETE error', error);
    const message =
      error instanceof Error ? error.message : 'Failed to clear demo data.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


