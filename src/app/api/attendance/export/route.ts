import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Only admin can export data
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId')
    const workMode = searchParams.get('workMode')
    const status = searchParams.get('status')

    // Build where clause
    const where: any = {}
    
    if (startDate && endDate) {
      where.checkInAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }
    
    if (userId) {
      where.userId = userId
    }
    
    if (workMode && ['WFO', 'WFH'].includes(workMode)) {
      where.workMode = workMode
    }
    
    if (status && ['ONTIME', 'LATE', 'ABSENT', 'EARLY_LEAVE'].includes(status)) {
      where.status = status
    }

    // Get attendance records with user info
    const attendanceRecords = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            nikKtp: true
          }
        }
      },
      orderBy: { checkInAt: 'desc' }
    })

    // Generate CSV content
    const csvHeaders = [
      'Tanggal',
      'Nama Karyawan',
      'Email',
      'NIK',
      'Mode Kerja',
      'Check In',
      'Check Out',
      'Status',
      'Lokasi Check In',
      'Lokasi Check Out',
      'Bukti Kerja',
      'Catatan'
    ]

    const csvRows = attendanceRecords.map(record => [
      record.checkInAt ? new Date(record.checkInAt).toLocaleDateString('id-ID') : '',
      record.user.fullName || '',
      record.user.email || '',
      record.user.nikKtp || '',
      record.workMode || '',
      record.checkInAt ? new Date(record.checkInAt).toLocaleString('id-ID') : '',
      record.checkOutAt ? new Date(record.checkOutAt).toLocaleString('id-ID') : '',
      record.status || '',
      record.latitudeIn && record.longitudeIn ? `${record.latitudeIn}, ${record.longitudeIn}` : '',
      record.latitudeOut && record.longitudeOut ? `${record.latitudeOut}, ${record.longitudeOut}` : '',
      record.proofOfWorkUrl ? 'Ya' : 'Tidak',
      record.notes || ''
    ])

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `attendance_report_${timestamp}.csv`

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (e) {
    console.error('Export attendance error:', e)
    return NextResponse.json({ error: 'Failed to export attendance data' }, { status: 500 })
  }
}


