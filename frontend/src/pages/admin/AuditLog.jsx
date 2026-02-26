import { useState, useEffect } from 'react';
import api from '../../../api/axios';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const endpoint = filterAction 
        ? `/platform/audit-log?action=${filterAction}`
        : '/platform/audit-log';
      const res = await api.get(endpoint);
      setLogs(res.data.data);
    } catch (err) {
      console.error("Failed to fetch audit log", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterAction]);

  const handleExport = async () => {
    try {
      const res = await api.get('/platform/export?type=audit_log', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'audit_log.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("Failed to export audit log", err);
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Audit Log</h1>
          <p className="mt-2 text-sm text-gray-700">Detailed record of all critical system actions and mutations.</p>
        </div>
        <div className="mt-4 sm:flex-none flex items-center space-x-4">
          <select 
            value={filterAction} 
            onChange={(e) => setFilterAction(e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
          >
            <option value="">All Actions</option>
            <option value="BOOKING_CREATED">Booking Created</option>
            <option value="DISRUPTION_REPORTED">Disruption Reported</option>
            <option value="LATE_CHECKOUT_APPROVED">Check-out Approved</option>
          </select>
          <button
            onClick={handleExport}
            className="block rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading audit logs...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Timestamp</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Actor UID</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Action</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Resource</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-gray-500">No logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                      <span className="block truncate max-w-xs" title={log.actor_uid}>{log.actor_uid}</span>
                      <span className="text-xs text-gray-500">{log.actor_role}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      <div className="font-mono text-xs">{log.resource_type}: {log.resource_id}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
