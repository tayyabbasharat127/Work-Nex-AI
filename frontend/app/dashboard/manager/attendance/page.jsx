'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Calendar } from 'lucide-react';

export default function ManagerAttendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance] = useState([
    { id: 1, name: 'John Doe', checkIn: '08:30 AM', checkOut: '05:30 PM', status: 'Present', hours: '9h 00m' },
    { id: 2, name: 'Jane Smith', checkIn: '08:45 AM', checkOut: '05:45 PM', status: 'Present', hours: '9h 00m' },
    { id: 3, name: 'Mike Johnson', checkIn: '---', checkOut: '---', status: 'On Leave', hours: '---' },
    { id: 4, name: 'Sarah Wilson', checkIn: '09:15 AM', checkOut: '05:15 PM', status: 'Late', hours: '8h 00m' },
  ]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="manager" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <h1 className="text-3xl font-bold">Team Attendance</h1>
          <p className="text-muted-foreground mt-1">View your team's attendance records.</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Date Filter */}
          <div className="bg-card border border-border rounded-lg p-6">
            <label className="block text-sm font-medium mb-2">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 rounded-lg border border-border bg-input text-foreground"
            />
          </div>

          {/* Attendance Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="text-left py-3 px-6 font-semibold">Name</th>
                  <th className="text-left py-3 px-6 font-semibold">Check In</th>
                  <th className="text-left py-3 px-6 font-semibold">Check Out</th>
                  <th className="text-left py-3 px-6 font-semibold">Work Hours</th>
                  <th className="text-left py-3 px-6 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attendance.map((record) => (
                  <tr key={record.id} className="hover:bg-background transition">
                    <td className="py-4 px-6 font-medium">{record.name}</td>
                    <td className="py-4 px-6 text-muted-foreground">{record.checkIn}</td>
                    <td className="py-4 px-6 text-muted-foreground">{record.checkOut}</td>
                    <td className="py-4 px-6 font-medium">{record.hours}</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        record.status === 'Present' ? 'bg-success/20 text-success' :
                        record.status === 'Late' ? 'bg-warning/20 text-warning' :
                        'bg-primary/20 text-primary'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
