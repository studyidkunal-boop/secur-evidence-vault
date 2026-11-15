import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Bell, CheckCircle2, ShieldAlert, X } from 'lucide-react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // Determine Socket Server URL (falls back to port 5000)
    const serverUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
      : 'http://localhost:5000';

    const socketClient = io(serverUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketClient.on('connect', () => {
      console.log('⚡ [Socket.io Client] Connected to server ID:', socketClient.id);
    });

    // Listen for 'new-evidence' event emitted by backend uploadEvidence
    socketClient.on('new-evidence', (evidence) => {
      console.log('🔔 [Socket.io Client] new-evidence received:', evidence);
      setNotificationCount((prev) => prev + 1);

      const newNotif = {
        id: evidence.id || Date.now(),
        case_number: evidence.case_number,
        title: `New Evidence: #${evidence.case_number}`,
        description: evidence.title || 'Evidence ingested and anchored.',
        status: evidence.status || 'PENDING',
        receivedAt: new Date().toLocaleTimeString(),
      };
      setNotifications((prev) => [newNotif, ...prev]);

      setToast({
        title: 'New Evidence Ingested - Pending Review',
        caseNumber: evidence.case_number,
        evidenceTitle: evidence.title,
        id: Date.now(),
      });
    });

    // Listen for 'judge-alert' event (e.g. "Judge accepted case")
    socketClient.on('judge-alert', (alertData) => {
      console.log('⚖️ [Socket.io Client] judge-alert received:', alertData);
      setNotificationCount((prev) => prev + 1);

      const newNotif = {
        id: alertData.id || Date.now(),
        case_number: alertData.case_number,
        title: alertData.title || `Judge accepted case #${alertData.case_number}`,
        description: alertData.description || 'Admitted to Court Docket under Section 65B.',
        receivedAt: alertData.receivedAt || new Date().toLocaleTimeString(),
      };
      setNotifications((prev) => [newNotif, ...prev]);

      setToast({
        title: alertData.title,
        caseNumber: alertData.case_number,
        evidenceTitle: alertData.description,
        id: Date.now(),
      });
    });

    // Listen for 'case-reviewed'
    socketClient.on('case-reviewed', (data) => {
      console.log('📝 [Socket.io Client] case-reviewed received:', data);
      setNotificationCount((prev) => prev + 1);

      const newNotif = {
        id: data.id || Date.now(),
        case_number: data.case_number,
        title: `Review: Case #${data.case_number} -> ${data.status}`,
        description: data.remarks || `Marked ${data.status} by ${data.reviewer_name || 'DCP'}`,
        status: data.status,
        receivedAt: new Date().toLocaleTimeString(),
      };
      setNotifications((prev) => [newNotif, ...prev]);
    });

    socketClient.on('connect_error', (err) => {
      console.warn('⚠️ [Socket.io Client] Connection error:', err.message);
    });

    setSocket(socketClient);

    return () => {
      socketClient.disconnect();
    };
  }, []);

  // Auto-dismiss toast notification after 5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  function clearNotifications() {
    setNotificationCount(0);
  }

  function dismissToast() {
    setToast(null);
  }

  return (
    <NotificationContext.Provider
      value={{
        socket,
        notificationCount,
        notifications,
        clearNotifications,
        setNotificationCount,
        toast,
        dismissToast,
      }}
    >
      {children}

      {/* Global Real-Time Toast Notification Popup */}
      {toast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-5 right-5 z-[9999] max-w-sm w-full bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 text-white rounded-2xl shadow-2xl p-4 flex items-start space-x-3.5 transition-all duration-300 animate-in fade-in slide-in-from-top-4"
        >
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider">
                Vault Alert
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Just Now</span>
            </div>
            <p className="text-xs font-bold text-slate-100 mt-0.5">
              {toast.title}
            </p>
            {(toast.caseNumber || toast.evidenceTitle) && (
              <p className="text-[11px] text-slate-400 font-mono mt-1 truncate">
                Case #{toast.caseNumber}: {toast.evidenceTitle}
              </p>
            )}
          </div>

          <button
            onClick={dismissToast}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </aside>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    return {
      socket: null,
      notificationCount: 0,
      notifications: [],
      clearNotifications: () => {},
      setNotificationCount: () => {},
      toast: null,
      dismissToast: () => {},
    };
  }
  return context;
}

