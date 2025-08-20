import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await prisma.attendanceConfig.findFirst()
    return NextResponse.json(config || {})
  } catch (e) {
    console.error('Get attendance config error:', e)
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      workStartHour,
      workEndHour,
      officeLat,
      officeLng,
      radiusMeters,
      useGeofence,
      enforceGeofence,
      requireProofOfWork,
      allowWFH
    } = body

    // Validate input
    if (workStartHour < 0 || workStartHour > 23 || workEndHour < 0 || workEndHour > 23) {
      return NextResponse.json({ error: 'Jam kerja harus antara 0-23' }, { status: 400 })
    }

    if (workStartHour >= workEndHour) {
      return NextResponse.json({ error: 'Jam mulai harus lebih awal dari jam selesai' }, { status: 400 })
    }

    if (useGeofence && (officeLat == null || officeLng == null || radiusMeters <= 0)) {
      return NextResponse.json({ error: 'Koordinat kantor dan radius diperlukan jika geofencing diaktifkan' }, { status: 400 })
    }

    if (officeLat != null && (officeLat < -90 || officeLat > 90)) {
      return NextResponse.json({ error: 'Latitude harus antara -90 dan 90' }, { status: 400 })
    }

    if (officeLng != null && (officeLng < -180 || officeLng > 180)) {
      return NextResponse.json({ error: 'Longitude harus antara -180 dan 180' }, { status: 400 })
    }

    // Create or update config
    const config = await prisma.attendanceConfig.upsert({
      where: { id: 'default' },
      update: {
        workStartHour,
        workEndHour,
        officeLat,
        officeLng,
        radiusMeters,
        useGeofence,
        enforceGeofence,
        requireProofOfWork,
        allowWFH
      },
      create: {
        id: 'default',
        workStartHour,
        workEndHour,
        officeLat,
        officeLng,
        radiusMeters,
        useGeofence,
        enforceGeofence,
        requireProofOfWork,
        allowWFH
      }
    })

    return NextResponse.json(config)
  } catch (e) {
    console.error('Update attendance config error:', e)
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}


