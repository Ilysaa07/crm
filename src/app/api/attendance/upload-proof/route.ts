import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateImageFile } from '@/lib/utils'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    const attendanceId = formData.get('attendanceId') as string

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    }

    if (!attendanceId) {
      return NextResponse.json({ error: 'ID kehadiran diperlukan' }, { status: 400 })
    }

    // Validate attendance record
    const attendance = await prisma.attendance.findFirst({
      where: {
        id: attendanceId,
        userId: session.user.id,
        workMode: 'WFH',
        checkOutAt: null // Only for open attendance records
      }
    })

    if (!attendance) {
      return NextResponse.json({ error: 'Record kehadiran WFH tidak ditemukan' }, { status: 400 })
    }

    // Validate file
    const fileValidation = validateImageFile(file)
    if (!fileValidation.isValid) {
      return NextResponse.json({ error: fileValidation.message }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `proof_${attendanceId}_${timestamp}.${fileExtension}`
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'attendance')
    await mkdir(uploadsDir, { recursive: true })

    // Save file
    const filePath = join(uploadsDir, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Generate public URL
    const fileUrl = `/uploads/attendance/${fileName}`

    // Update attendance record with proof of work
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        proofOfWorkUrl: fileUrl,
        proofOfWorkName: file.name
      }
    })

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      attendance: updatedAttendance
    })

  } catch (e) {
    console.error('Upload proof of work error:', e)
    return NextResponse.json({ error: 'Gagal mengunggah file' }, { status: 500 })
  }
}
