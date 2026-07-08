'use client';
import { useEffect, useRef, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import type { Student, PaymentRecord } from '../types';
import { QrCode, Search, ScanLine, Camera, CameraOff } from 'lucide-react';
import jsQR from 'jsqr';
import StudentScanPopup from '../components/students/StudentScanPopup';

export default function QRScanPage() {
  const { students } = useDataStore();
  const [query, setQuery] = useState('');
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const studentsRef = useRef(students);
  useEffect(() => { studentsRef.current = students; }, [students]);

  const openStudent = (s: Student) => setScannedStudent(s);

  // Camera scanning loop
  useEffect(() => {
    if (!cameraActive) return;

    let stopped = false;

    const stopLocal = () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        rafRef.current = requestAnimationFrame(scan);
      } catch {
        setCameraError('Camera access denied or not available.');
        setCameraActive(false);
      }
    };

    let lastScan = 0;
    const SCAN_INTERVAL = 300;

    const scan = (timestamp: number) => {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(scan);
        return;
      }
      if (timestamp - lastScan < SCAN_INTERVAL) {
        rafRef.current = requestAnimationFrame(scan);
        return;
      }
      lastScan = timestamp;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
      if (code?.data) {
        console.log('QR raw data:', code.data);
        try {
          const parsed = JSON.parse(code.data);
          const all = studentsRef.current;
          // match by qrToken (StudentScanPopup QR) OR by studentId (StudentProfile QR)
          const found = all.find(s =>
            (parsed.qrToken && s.qrToken === parsed.qrToken) ||
            (parsed.studentId && s.studentId === parsed.studentId)
          );
          if (found) {
            stopLocal();
            openStudent(found);
            return;
          }
        } catch {
          // plain text studentId fallback
          const plain = code.data.trim();
          const found = studentsRef.current.find(s => s.studentId === plain);
          if (found) { stopLocal(); openStudent(found); return; }
        }
      }
      rafRef.current = requestAnimationFrame(scan);
    };

    startCamera();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
      stopLocal();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const toggleCamera = () => {
    if (cameraActive) {
      stopCamera();
      setCameraActive(false);
    } else {
      setCameraError('');
      setCameraActive(true);
    }
  };

  const handleSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const found = students.find(s =>
      s.studentId.toLowerCase() === q || s.name.toLowerCase().includes(q)
    );
    if (found) openStudent(found);
  };

  const handlePaymentAdd = (payment: Omit<PaymentRecord, 'id'>) => {
    useDataStore.getState().addPayment(scannedStudent!.id, payment);
  };
  const handlePaymentUpdate = (paymentId: string, data: Partial<PaymentRecord>) => {
    useDataStore.getState().updatePayment(scannedStudent!.id, paymentId, data);
  };
  const handleAttendanceUpdate = (moduleId: string, date: string, status: 'present' | 'absent') => {
    useDataStore.getState().updateAttendance(scannedStudent!.id, moduleId, date, status);
  };

  const currentStudent = scannedStudent ? students.find(s => s.id === scannedStudent.id) || scannedStudent : null;

  return (
    <div className="mx-auto max-w-2xl p-3 pb-20 sm:p-6 sm:pb-6">
      <div className="mb-6 text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <QrCode className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">QR Scanner</h1>
        <p className="text-gray-500 text-sm mt-1">Scan student QR code or search by ID / name</p>
      </div>

      {/* Camera Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
        <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
          {cameraActive ? (
            <>
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {/* scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-52 h-52 border-2 border-indigo-400 rounded-2xl relative">
                  <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl" />
                  <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl" />
                  <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl" />
                  <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-xl" />
                  <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-indigo-300 animate-pulse" />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-10">
              <Camera className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Camera is off</p>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="p-4 flex items-center justify-between">
          {cameraError && <p className="text-xs text-red-500">{cameraError}</p>}
          {!cameraError && <p className="text-xs text-gray-400">{cameraActive ? 'Scanning… point at student QR code' : 'Click to start camera'}</p>}
          <button onClick={toggleCamera}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${cameraActive ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
            {cameraActive ? <><CameraOff className="w-4 h-4" /> Stop</> : <><Camera className="w-4 h-4" /> Start Camera</>}
          </button>
        </div>
      </div>

      {/* Manual Search */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Manual Search</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Student ID (e.g. May24#0001) or name…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          <button onClick={handleSearch} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Access */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Access</p>
        <div className="space-y-2">
          {students.slice(0, 6).map(s => (
            <button key={s.id} onClick={() => openStudent(s)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 transition-colors text-left">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {s.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                <p className="text-xs text-gray-500 font-mono">{s.studentId}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${s.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : s.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                {s.status.toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {currentStudent && (
        <StudentScanPopup
          student={currentStudent}
          onClose={() => setScannedStudent(null)}
          onPaymentAdd={handlePaymentAdd}
          onPaymentUpdate={handlePaymentUpdate}
          onAttendanceUpdate={handleAttendanceUpdate}
        />
      )}
    </div>
  );
}
