'use client'

import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import Card from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Input } from '@/components/ui/input'
import { Search, Filter, Download, Eye, MapPin, Calendar } from 'lucide-react'
import { formatTime, formatDate } from '@/lib/utils'

interface AttendanceRecord {
  id: string
  checkInAt: string
  checkOutAt?: string
  workMode: 'WFO' | 'WFH'
  status: string
  latitudeIn?: number
  longitudeIn?: number
  latitudeOut?: number
  longitudeOut?: number
  proofOfWorkUrl?: string
  notes?: string
  user: {
    id: string
    fullName: string
    email: string
    profilePicture?: string
  }
}

interface AttendanceHistory {
  attendanceRecords: AttendanceRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  summary: Array<{
    status: string
    workMode: string
    _count: number
  }>
}

export default function AdminAttendanceHistoryPage() {
  const [history, setHistory] = useState<AttendanceHistory | null>(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    workMode: '',
    status: '',
    search: ''
  })
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    // Set default date range to current month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    setFilters(prev => ({
      ...prev,
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0]
    }))
  }, [])

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      loadAttendanceHistory()
    }
  }, [filters, currentPage])

  const loadAttendanceHistory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: currentPage.toString(),
        limit: '20'
      })

      if (filters.workMode) params.append('workMode', filters.workMode)
      if (filters.status) params.append('status', filters.status)

      const res = await fetch(`/api/attendance/history?${params}`)
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
      }
    } catch (error) {
      console.error('Error loading attendance history:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
    setCurrentPage(1)
  }

  const exportData = async () => {
    try {
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate
      })

      if (filters.workMode) params.append('workMode', filters.workMode)
      if (filters.status) params.append('status', filters.status)

      const url = `/api/attendance/export?${params}`
      const link = document.createElement('a')
      link.href = url
      link.download = `attendance_report_${filters.startDate}_${filters.endDate}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ONTIME': return 'success'
      case 'LATE': return 'warning'
      case 'ABSENT': return 'danger'
      case 'EARLY_LEAVE': return 'warning'
      default: return 'default'
    }
  }

  const getWorkModeBadgeVariant = (workMode: string) => {
    return workMode === 'WFO' ? 'default' : 'secondary'
  }

  if (!history) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Memuat data kehadiran...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Riwayat Kehadiran</h1>
          <Button onClick={exportData} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Filter Data</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Mulai
              </label>
                             <Input
                 type="date"
                 value={filters.startDate}
                 onChange={(e) => handleFilterChange('startDate', e.target.value)}
               />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Selesai
              </label>
                             <Input
                 type="date"
                 value={filters.endDate}
                 onChange={(e) => handleFilterChange('endDate', e.target.value)}
               />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mode Kerja
              </label>
                             <select
                 value={filters.workMode}
                 onChange={(e) => handleFilterChange('workMode', e.target.value)}
                 className="flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
               >
                <option value="">Semua Mode</option>
                <option value="WFO">WFO</option>
                <option value="WFH">WFH</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
                             <select
                 value={filters.status}
                 onChange={(e) => handleFilterChange('status', e.target.value)}
                 className="flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
               >
                <option value="">Semua Status</option>
                <option value="ONTIME">Tepat Waktu</option>
                <option value="LATE">Terlambat</option>
                <option value="ABSENT">Tidak Hadir</option>
                <option value="EARLY_LEAVE">Pulang Awal</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Summary Statistics */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Ringkasan Statistik</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {history.summary.map((item, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {item._count}
                </div>
                <div className="text-sm text-gray-600">
                  {item.status} - {item.workMode}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Attendance Records */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Data Kehadiran ({history.pagination.total} records)
            </h3>
            <div className="text-sm text-gray-600">
              Halaman {history.pagination.page} dari {history.pagination.totalPages}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Karyawan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lokasi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bukti Kerja
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.attendanceRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          {record.user.profilePicture ? (
                            <img
                              src={record.user.profilePicture}
                              alt={record.user.fullName}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-700">
                              {record.user.fullName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {record.user.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {record.user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(new Date(record.checkInAt))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getWorkModeBadgeVariant(record.workMode)}>
                        {record.workMode}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(new Date(record.checkInAt))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.checkOutAt ? formatTime(new Date(record.checkOutAt)) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getStatusBadgeVariant(record.status)}>
                        {record.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.latitudeIn && record.longitudeIn ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-green-600" />
                          <span>Check-in</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.proofOfWorkUrl ? (
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Lihat
                        </Button>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {history.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Menampilkan {((history.pagination.page - 1) * history.pagination.limit) + 1} - {Math.min(history.pagination.page * history.pagination.limit, history.pagination.total)} dari {history.pagination.total} hasil
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(history.pagination.totalPages, prev + 1))}
                  disabled={currentPage === history.pagination.totalPages}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  )
}
