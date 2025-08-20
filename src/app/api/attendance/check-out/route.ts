import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateWorkMode, isWithinWorkingHours } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Parse request body for location data and proof of work
    const body = await req.json().catch(() => ({}))
    const { latitude, longitude, proofOfWorkUrl, proofOfWorkName } = body || {}

    const today = new Date()
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)

    // Get user data for notification
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, fullName: true, email: true }
    })

    const last = await prisma.attendance.findFirst({
      where: { userId: session.user.id, checkInAt: { gte: startOfDay } },
      orderBy: { checkInAt: 'desc' },
    })
    
    if (!last || last.checkOutAt) {
      return NextResponse.json({ error: 'Tidak ada check-in hari ini atau sudah check-out' }, { status: 400 })
    }

    // Load admin config for validation
    const cfg = await prisma.attendanceConfig.findFirst()
    const endHour = cfg?.workEndHour ?? parseInt(process.env.WORK_END_HOUR || '17', 10)
    
    // Check working hours
    const timeValidation = isWithinWorkingHours(today, 0, endHour)
    const status = timeValidation.status

    // Validate proof of work for WFH
    if (last.workMode === 'WFH' && cfg?.requireProofOfWork) {
      if (!proofOfWorkUrl || !proofOfWorkName) {
        return NextResponse.json({ 
          error: 'Bukti kerja (screenshot) diperlukan untuk mode WFH' 
        }, { status: 400 })
      }
    }

    // Validate location if geofencing is enabled
    let distanceMeters: number | null = null
    let validationMessage = ''

    if (cfg?.useGeofence && cfg.officeLat != null && cfg.officeLng != null && cfg.radiusMeters) {
      if (latitude != null && longitude != null) {
        // Calculate distance
        const toRad = (v: number) => (v * Math.PI) / 180
        const R = 6371000 // meters
        const dLat = toRad(latitude - cfg.officeLat)
        const dLon = toRad(longitude - cfg.officeLng)
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(cfg.officeLat)) * Math.cos(toRad(latitude)) * Math.sin(dLon / 2) ** 2
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        distanceMeters = Math.round(R * c)

        // Validate work mode for check-out
        if (last.workMode === 'WFO' && cfg.enforceGeofence) {
          const workModeValidation = validateWorkMode(
            'WFO',
            latitude,
            longitude,
            cfg.officeLat,
            cfg.officeLng,
            cfg.radiusMeters,
            true
          )

          if (!workModeValidation.isValid) {
            return NextResponse.json({ 
              error: workModeValidation.message,
              distanceMeters 
            }, { status: 400 })
          }
        }

        validationMessage = `Check-out: ${distanceMeters}m dari kantor`
      }
    }

    const attendance = await prisma.attendance.update({
      where: { id: last.id },
      data: { 
        checkOutAt: new Date(),
        status: status as any,
        // Update location data for check-out
        latitudeOut: latitude ?? null,
        longitudeOut: longitude ?? null,
        // Update proof of work for WFH
        ...(proofOfWorkUrl && proofOfWorkName ? {
          proofOfWorkUrl,
          proofOfWorkName
        } : {}),
        // Update notes with validation info
        notes: last.notes ? `${last.notes}; ${validationMessage}` : validationMessage,
      },
    })

    try {
      const io = (global as any).io
      if (io) {
        // Send more detailed notification with user name
        io.emit('attendance_check_out', { 
          userId: session.user.id, 
          attendanceId: attendance.id,
          workMode: last.workMode,
          status,
          distanceMeters,
          userName: user?.fullName || 'Karyawan',
          timestamp: new Date().toISOString()
        })
      }
    } catch {}

    return NextResponse.json({ 
      attendance, 
      user,
      status,
      distanceMeters,
      validationMessage 
    })
  } catch (e) {
    console.error('check-out error', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}


