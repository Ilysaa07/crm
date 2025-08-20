import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateWorkMode, isWithinWorkingHours } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { latitude, longitude, ipAddress, method, workMode } = await req.json()
    const now = new Date()

    // Validate work mode
    if (!workMode || !['WFO', 'WFH'].includes(workMode)) {
      return NextResponse.json({ error: 'Mode kerja harus WFO atau WFH' }, { status: 400 })
    }

    // Get user data for notification
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, fullName: true, email: true }
    })

    // Load admin config
    const cfg = await prisma.attendanceConfig.findFirst()
    const startHour = cfg?.workStartHour ?? parseInt(process.env.WORK_START_HOUR || '9', 10)
    const endHour = cfg?.workEndHour ?? parseInt(process.env.WORK_END_HOUR || '17', 10)
    
    // Check working hours
    const timeValidation = isWithinWorkingHours(now, startHour, endHour)
    const status = timeValidation.status

    // Validate work mode and location
    let distanceMeters: number | null = null
    let validationMessage = ''

    if (cfg?.useGeofence && cfg.officeLat != null && cfg.officeLng != null && cfg.radiusMeters) {
      if (latitude == null || longitude == null) {
        if (cfg.enforceGeofence) {
          return NextResponse.json({ error: 'GPS diperlukan untuk validasi lokasi' }, { status: 400 })
        }
      } else {
        // Calculate distance
        const toRad = (v: number) => (v * Math.PI) / 180
        const R = 6371000 // meters
        const dLat = toRad(latitude - cfg.officeLat)
        const dLon = toRad(longitude - cfg.officeLng)
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(cfg.officeLat)) * Math.cos(toRad(latitude)) * Math.sin(dLon / 2) ** 2
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        distanceMeters = Math.round(R * c)

        // Validate work mode
        const workModeValidation = validateWorkMode(
          workMode,
          latitude,
          longitude,
          cfg.officeLat,
          cfg.officeLng,
          cfg.radiusMeters,
          cfg.enforceGeofence || false
        )

        if (!workModeValidation.isValid) {
          return NextResponse.json({ 
            error: workModeValidation.message,
            distanceMeters 
          }, { status: 400 })
        }

        validationMessage = workModeValidation.message
      }
    }

    // Check if user already has an open attendance record
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId: session.user.id,
        checkInAt: { not: null },
        checkOutAt: null
      }
    })

    if (existingAttendance) {
      return NextResponse.json({ error: 'Anda sudah melakukan check-in hari ini' }, { status: 400 })
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId: session.user.id,
        checkInAt: now,
        workMode: workMode as any,
        method: method === 'GPS' ? 'GPS' : 'IP',
        ipAddress: ipAddress || null,
        latitudeIn: latitude ?? null,
        longitudeIn: longitude ?? null,
        status: status as any,
        notes: distanceMeters != null ? `distance=${distanceMeters}m, ${validationMessage}` : validationMessage,
      },
    })

    // Realtime notify admin with user name
    try {
      const io = (global as any).io
      if (io) {
        io.emit('attendance_check_in', { 
          userId: session.user.id, 
          attendanceId: attendance.id, 
          status,
          workMode,
          distanceMeters,
          userName: user?.fullName || 'Karyawan',
          timestamp: now.toISOString()
        })
      }
    } catch {}

    return NextResponse.json({ 
      attendance, 
      config: cfg ?? null, 
      distanceMeters,
      validationMessage,
      workMode 
    })
  } catch (e) {
    console.error('check-in error', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}


