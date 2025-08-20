'use client'

import React, { useState, useEffect } from 'react'
import EmployeeLayout from '@/components/layout/EmployeeLayout'
import Card from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import dynamic from 'next/dynamic'
import { MapPin, Upload, Clock, MapPinOff } from 'lucide-react'

// Import map component dynamically to avoid SSR issues with Leaflet
const LocationMap = dynamic(() => import('@/components/map/LocationMap'), {
  ssr: false,
  loading: () => <div className="h-[200px] w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center"><MapPin className="h-8 w-8 text-gray-400" /></div>
})

interface AttendanceConfig {
  workStartHour?: number
  workEndHour?: number
  officeLat?: number
  officeLng?: number
  radiusMeters?: number
  useGeofence?: boolean
  enforceGeofence?: boolean
  requireProofOfWork?: boolean
  allowWFH?: boolean
}

interface CurrentAttendance {
  id: string
  checkInAt: string
  workMode: 'WFO' | 'WFH'
  status: string
}

export default function EmployeeAttendancePage() {
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<string>('')
  const [distance, setDistance] = useState<number | null>(null)
  const [config, setConfig] = useState<AttendanceConfig | null>(null)
  const [userLocation, setUserLocation] = useState<{lat?: number; lng?: number} | null>(null)
  const [workMode, setWorkMode] = useState<'WFO' | 'WFH'>('WFO')
  const [currentAttendance, setCurrentAttendance] = useState<CurrentAttendance | null>(null)
  const [proofOfWorkFile, setProofOfWorkFile] = useState<File | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)

  useEffect(() => {
    // Load attendance config when component mounts
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/admin/attendance-config')
        const data = await res.json()
        if (res.ok) {
          setConfig(data)
          // Set default work mode based on config
          if (data.allowWFH === false) {
            setWorkMode('WFO')
          }
        }
      } catch (error) {
        console.error('Error loading attendance config:', error)
      }
    }
    
    loadConfig()
    checkCurrentAttendance()
  }, [])

  const checkCurrentAttendance = async () => {
    try {
      const today = new Date()
      const startOfDay = new Date(today)
      startOfDay.setHours(0, 0, 0, 0)
      
      const res = await fetch(`/api/attendance/history?startDate=${startOfDay.toISOString()}&endDate=${today.toISOString()}&limit=1`)
      const data = await res.json()
      
      if (res.ok && data.attendanceRecords.length > 0) {
        const latest = data.attendanceRecords[0]
        if (!latest.checkOutAt) {
          setCurrentAttendance(latest)
        }
      }
    } catch (error) {
      console.error('Error checking current attendance:', error)
    }
  }

  const getIp = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json')
      const data = await res.json()
      return data.ip as string
    } catch {
      return ''
    }
  }

  const getUserLocation = async () => {
    return new Promise<{ lat?: number; lng?: number }>((resolve) => {
      if (!navigator.geolocation) return resolve({})
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const location = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setUserLocation(location)
          resolve(location)
        },
        () => resolve({})
      )
    })
  }

  const doCheckIn = async () => {
    setLoading(true)
    try {
      const method = 'GPS'
      const coords = await getUserLocation()
      const ip = await getIp()
      
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          method, 
          latitude: coords.lat, 
          longitude: coords.lng, 
          ipAddress: ip,
          workMode 
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setDistance(data.distanceMeters ?? null)
        setConfig(data.config ?? null)
        setLastResult(`Check-in berhasil (${data.attendance.status}) - Mode: ${workMode}`)
        checkCurrentAttendance()
      } else {
        setLastResult(data.error || 'Gagal melakukan check-in')
      }
    } catch (error) {
      setLastResult('Terjadi kesalahan saat check-in')
    } finally {
      setLoading(false)
    }
  }

  const doCheckOut = async () => {
    if (!currentAttendance) return
    
    setLoading(true)
    try {
      const coords = await getUserLocation()
      
      const body: any = { 
        latitude: coords.lat, 
        longitude: coords.lng 
      }

      // Add proof of work for WFH if required
      if (currentAttendance.workMode === 'WFH' && config?.requireProofOfWork && proofOfWorkFile) {
        body.proofOfWorkUrl = 'pending' // Will be updated after upload
        body.proofOfWorkName = proofOfWorkFile.name
      }

      const res = await fetch('/api/attendance/check-out', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const data = await res.json()
      
      if (res.ok) {
        // Upload proof of work if it's WFH
        if (currentAttendance.workMode === 'WFH' && config?.requireProofOfWork && proofOfWorkFile) {
          await uploadProofOfWork(currentAttendance.id, proofOfWorkFile)
        }
        
        setLastResult(`Check-out berhasil (${data.user?.fullName || ''})`)
        setCurrentAttendance(null)
        setProofOfWorkFile(null)
        checkCurrentAttendance()
      } else {
        setLastResult(data.error || 'Gagal melakukan check-out')
      }
    } catch (error) {
      setLastResult('Terjadi kesalahan saat check-out')
    } finally {
      setLoading(false)
    }
  }

  const uploadProofOfWork = async (attendanceId: string, file: File) => {
    setUploadingProof(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('attendanceId', attendanceId)
      
      const res = await fetch('/api/attendance/upload-proof', {
        method: 'POST',
        body: formData
      })
      
      if (!res.ok) {
        throw new Error('Failed to upload proof of work')
      }
    } catch (error) {
      console.error('Error uploading proof of work:', error)
      setLastResult('Berhasil check-out tetapi gagal upload bukti kerja')
    } finally {
      setUploadingProof(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setProofOfWorkFile(file)
    }
  }

  const isCheckInDisabled = loading || (config?.allowWFH === false && workMode === 'WFH')
  const isCheckOutDisabled = loading || !currentAttendance || uploadingProof

  return (
    <EmployeeLayout>
      <div className="space-y-4">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-2">Kehadiran</h2>
          <p className="text-gray-600 mb-4">Lakukan check-in/check-out dengan mode kerja yang sesuai</p>
          
          {/* Work Mode Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mode Kerja
            </label>
            <div className="flex gap-2">
              <Button
                variant={workMode === 'WFO' ? 'default' : 'outline'}
                onClick={() => setWorkMode('WFO')}
                disabled={config?.allowWFH === false}
                className="flex items-center gap-2"
              >
                <MapPin className="h-4 w-4" />
                Work From Office (WFO)
              </Button>
              <Button
                variant={workMode === 'WFH' ? 'default' : 'outline'}
                onClick={() => setWorkMode('WFH')}
                disabled={config?.allowWFH === false}
                className="flex items-center gap-2"
              >
                <MapPinOff className="h-4 w-4" />
                Work From Home (WFH)
              </Button>
            </div>
            {config?.allowWFH === false && (
              <p className="text-sm text-red-600 mt-1">Mode WFH tidak diizinkan oleh admin</p>
            )}
          </div>

          {/* Current Status */}
          {currentAttendance && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Sedang Check-in</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Check-in: {new Date(currentAttendance.checkInAt).toLocaleString('id-ID')} - Mode: {currentAttendance.workMode}
              </p>
            </div>
          )}

          {/* Proof of Work Upload for WFH */}
          {currentAttendance?.workMode === 'WFH' && config?.requireProofOfWork && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label className="block text-sm font-medium text-yellow-800 mb-2">
                Bukti Kerja (Screenshot) - Wajib untuk WFH
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {proofOfWorkFile && (
                  <Badge variant="default">{proofOfWorkFile.name}</Badge>
                )}
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                Upload screenshot yang menunjukkan tugas yang sedang dikerjakan
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex gap-2 mb-3">
                <Button 
                  onClick={doCheckIn} 
                  disabled={isCheckInDisabled}
                  className="flex items-center gap-2"
                >
                  {loading ? 'Memproses...' : 'Check-in'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={doCheckOut} 
                  disabled={isCheckOutDisabled}
                  className="flex items-center gap-2"
                >
                  {loading ? 'Memproses...' : 'Check-out'}
                </Button>
              </div>
              
              {lastResult && (
                <p className={`text-sm mb-3 ${
                  lastResult.includes('berhasil') ? 'text-green-700' : 'text-red-700'
                }`}>
                  {lastResult}
                </p>
              )}
              
              {config?.useGeofence && (
                <div className="flex items-center gap-2">
                  <Badge variant="default">Radius: {config.radiusMeters}m</Badge>
                  {typeof distance === 'number' && (
                    <Badge variant={distance <= (config.radiusMeters || 0) ? 'success' : 'danger'}>
                      Jarak: {distance}m
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Lokasi Kantor</h3>
              {config && config.officeLat && config.officeLng ? (
                <LocationMap
                  latitude={config.officeLat}
                  longitude={config.officeLng}
                  radius={config.radiusMeters || 200}
                  height="200px"
                />
              ) : (
                <div className="bg-gray-100 rounded-lg h-[200px] flex items-center justify-center">
                  <p className="text-gray-500 text-sm">Lokasi kantor belum diatur</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </EmployeeLayout>
  )
}


