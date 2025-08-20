import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || session.user.id
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const workMode = searchParams.get('workMode')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Check if user is admin or requesting own data
    const isAdmin = session.user.role === 'ADMIN'
    if (!isAdmin && userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build where clause
    const where: any = {}
    
    if (userId) {
      where.userId = userId
    }
    
    if (startDate && endDate) {
      where.checkInAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }
    
    if (workMode && ['WFO', 'WFH'].includes(workMode)) {
      where.workMode = workMode
    }
    
    if (status && ['ONTIME', 'LATE', 'ABSENT', 'EARLY_LEAVE'].includes(status)) {
      where.status = status
    }

    // Get attendance records with user info
    const [attendanceRecords, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              profilePicture: true
            }
          }
        },
        orderBy: { checkInAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.attendance.count({ where })
    ])

    // Calculate summary statistics
    const summary = await prisma.attendance.groupBy({
      by: ['status', 'workMode'],
      where,
      _count: true
    })

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      attendanceRecords,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      summary,
      filters: {
        userId,
        startDate,
        endDate,
        workMode,
        status
      }
    })

  } catch (e) {
    console.error('Get attendance history error:', e)
    return NextResponse.json({ error: 'Failed to fetch attendance history' }, { status: 500 })
  }
}
