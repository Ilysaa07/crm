'use client'

import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import Card from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Input } from '@/components/ui/input'
import { MapPin, Settings, Users, Download, Eye } from 'lucide-react'
import dynamic from 'next/dynamic'

// Import map component dynamically to avoid SSR issues with Leaflet
const LocationMap = dynamic(() => import('@/components/map/LocationMap'), {
  ssr: false,
  loading: () => <div className="h-[200px] w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center"><MapPin className="h-8 w-8 text-gray-400" /></div>
})

interface AttendanceConfig {
  id?: string
  workStartHour: number
  workEndHour: number
  officeLat?: number
  officeLng?: number
  radiusMeters: number
  useGeofence: boolean
  enforceGeofence: boolean
  requireProofOfWork: boolean
  allowWFH: boolean
}

export default function AdminAttendancePage() {
  const [config, setConfig] = useState<AttendanceConfig>({
    workStartHour: 9,
    workEndHour: 17,
    radiusMeters: 200,
    useGeofence: false,
    enforceGeofence: false,
    requireProofOfWork: true,
    allowWFH: true
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showMap, setShowMap] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/attendance-config')
      if (res.ok) {
        const data = await res.json()
        if (data.id) {
          setConfig(data)
        }
      }
    } catch (error) {
      console.error('Error loading config:', error)
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    setMessage('')
    
    try {
      const res = await fetch('/api/admin/attendance-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      
      if (res.ok) {
        setMessage('Konfigurasi berhasil disimpan')
        await loadConfig()
      } else {
        const data = await res.json()
        setMessage(data.error || 'Gagal menyimpan konfigurasi')
      }
    } catch (error) {
      setMessage('Terjadi kesalahan saat menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof AttendanceConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setConfig(prev => ({
            ...prev,
            officeLat: position.coords.latitude,
            officeLng: position.coords.longitude
          }))
        },
        (error) => {
          console.error('Error getting location:', error)
          setMessage('Gagal mendapatkan lokasi saat ini')
        }
      )
    } else {
      setMessage('Geolocation tidak didukung di browser ini')
    }
  }

  const exportAttendance = async () => {
    try {
      const today = new Date()
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
      const endDate = today.toISOString()
      
      const url = `/api/attendance/export?startDate=${startDate}&endDate=${endDate}`
      const link = document.createElement('a')
      link.href = url
      link.download = `attendance_report_${today.toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      setMessage('Gagal export data')
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Manajemen Kehadiran</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowMap(!showMap)}>
              <Eye className="h-4 w-4 mr-2" />
              {showMap ? 'Sembunyikan' : 'Tampilkan'} Peta
            </Button>
            <Button variant="outline" onClick={exportAttendance}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            </div>
          </div>

        {/* Configuration Card */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Konfigurasi Kehadiran</h2>
          </div>

          {message && (
            <div className={`p-3 rounded-lg mb-4 ${
              message.includes('berhasil') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Settings */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Pengaturan Dasar</h3>
              
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jam Mulai Kerja
                </label>
                                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={config.workStartHour}
                    onChange={(e) => handleInputChange('workStartHour', parseInt(e.target.value))}
                  />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jam Selesai Kerja
                </label>
                                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={config.workEndHour}
                    onChange={(e) => handleInputChange('workEndHour', parseInt(e.target.value))}
                  />
            </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowWFH"
                  checked={config.allowWFH}
                  onChange={(e) => handleInputChange('allowWFH', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="allowWFH" className="text-sm font-medium text-gray-700">
                  Izinkan Mode WFH
                </label>
            </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requireProofOfWork"
                  checked={config.requireProofOfWork}
                  onChange={(e) => handleInputChange('requireProofOfWork', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="requireProofOfWork" className="text-sm font-medium text-gray-700">
                  Wajib Upload Bukti Kerja untuk WFH
                </label>
            </div>
          </div>

            {/* Geofencing Settings */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Pengaturan Geofencing</h3>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useGeofence"
                  checked={config.useGeofence}
                  onChange={(e) => handleInputChange('useGeofence', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="useGeofence" className="text-sm font-medium text-gray-700">
                  Aktifkan Geofencing
                </label>
                </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enforceGeofence"
                  checked={config.enforceGeofence}
                  onChange={(e) => handleInputChange('enforceGeofence', e.target.checked)}
                  disabled={!config.useGeofence}
                  className="rounded border-gray-300"
                />
                <label htmlFor="enforceGeofence" className="text-sm font-medium text-gray-700">
                  Wajib Berada di Area Kantor
                </label>
              </div>

              {config.useGeofence && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude Kantor
                    </label>
                                         <Input
                       type="number"
                       step="any"
                       value={config.officeLat || ''}
                       onChange={(e) => handleInputChange('officeLat', parseFloat(e.target.value) || undefined)}
                       placeholder="-6.2088"
                     />
              </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude Kantor
                    </label>
                                         <Input
                       type="number"
                       step="any"
                       value={config.officeLng || ''}
                       onChange={(e) => handleInputChange('officeLng', parseFloat(e.target.value) || undefined)}
                       placeholder="106.8456"
                     />
            </div>

            <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Radius (meter)
                    </label>
                                         <Input
                       type="number"
                       min="50"
                       max="10000"
                       value={config.radiusMeters}
                       onChange={(e) => handleInputChange('radiusMeters', parseInt(e.target.value))}
              />
            </div>

                  <Button variant="outline" onClick={getCurrentLocation} className="w-full">
                    <MapPin className="h-4 w-4 mr-2" />
                    Gunakan Lokasi Saat Ini
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mt-6">
            <Button onClick={saveConfig} disabled={saving} className="w-full md:w-auto">
              {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
            </Button>
          </div>
        </Card>

        {/* Map Preview */}
        {showMap && config.officeLat && config.officeLng && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Peta Lokasi Kantor</h3>
            <LocationMap
              latitude={config.officeLat}
              longitude={config.officeLng}
              radius={config.radiusMeters}
              height="400px"
            />
            <div className="mt-4 flex gap-2">
              <Badge variant="default">
                Lat: {config.officeLat.toFixed(6)}
              </Badge>
              <Badge variant="default">
                Lng: {config.officeLng.toFixed(6)}
              </Badge>
              <Badge variant="default">
                Radius: {config.radiusMeters}m
              </Badge>
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Aksi Cepat</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Users className="h-6 w-6 mb-2" />
              <span>Lihat Kehadiran</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Download className="h-6 w-6 mb-2" />
              <span>Export Laporan</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Settings className="h-6 w-6 mb-2" />
              <span>Pengaturan</span>
            </Button>
          </div>
        </Card>
      </div>
    </AdminLayout>
  )
}


