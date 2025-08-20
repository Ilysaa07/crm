import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Geofencing utilities
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export function isWithinGeofence(
  userLat: number,
  userLon: number,
  officeLat: number,
  officeLon: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(userLat, userLon, officeLat, officeLon);
  return distance <= radiusMeters;
}

export function validateWorkMode(
  workMode: 'WFO' | 'WFH',
  userLat: number,
  userLon: number,
  officeLat: number,
  officeLon: number,
  radiusMeters: number,
  enforceGeofence: boolean
): { isValid: boolean; message: string } {
  if (workMode === 'WFO') {
    if (enforceGeofence) {
      const isWithin = isWithinGeofence(userLat, userLon, officeLat, officeLon, radiusMeters);
      if (!isWithin) {
        return {
          isValid: false,
          message: 'Anda harus berada di kantor untuk mode WFO. Silakan pilih mode WFH atau pindah ke lokasi kantor.'
        };
      }
    }
    return { isValid: true, message: 'Validasi lokasi berhasil' };
  } else if (workMode === 'WFH') {
    // For WFH, we just log the location for transparency
    return { isValid: true, message: 'Mode WFH aktif. Lokasi akan dicatat untuk transparansi.' };
  }
  
  return { isValid: false, message: 'Mode kerja tidak valid' };
}

// Time utilities
export function isWithinWorkingHours(
  currentTime: Date,
  startHour: number,
  endHour: number
): { isWithin: boolean; status: 'ONTIME' | 'LATE' | 'EARLY_LEAVE' } {
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  const startTimeInMinutes = startHour * 60;
  const endTimeInMinutes = endHour * 60;
  
  if (currentTimeInMinutes < startTimeInMinutes) {
    return { isWithin: false, status: 'ONTIME' };
  } else if (currentTimeInMinutes > endTimeInMinutes) {
    return { isWithin: false, status: 'EARLY_LEAVE' };
  } else {
    return { isWithin: true, status: 'ONTIME' };
  }
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// File validation utilities
export function validateImageFile(file: File): { isValid: boolean; message: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      message: 'Format file tidak didukung. Gunakan JPEG, PNG, atau WebP.'
    };
  }
  
  if (file.size > maxSize) {
    return {
      isValid: false,
      message: 'Ukuran file terlalu besar. Maksimal 5MB.'
    };
  }
  
  return { isValid: true, message: 'File valid' };
}
