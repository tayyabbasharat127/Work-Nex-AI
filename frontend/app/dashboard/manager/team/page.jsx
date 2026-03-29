'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Mail, Phone, MoreVertical } from 'lucide-react';
import { userAPI } from '@/lib/api';
import { toast } from 'sonner';

export default function ManagerTeam() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      const data = await userAPI.getUsers({ role: 'Employee' });
      setTeamMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to load team members');
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="manager" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <h1 className="text-3xl font-bold">My Team</h1>
          <p className="text-muted-foreground mt-1">Manage and view team members information.</p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No team members found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamMembers.map((member) => (
                <div key={member.id} className="bg-card border border-border rounded-lg p-6 hover:border-primary transition">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.role || 'Employee'}</p>
                    </div>
                    <button className="p-2 hover:bg-background rounded-lg">
                      <MoreVertical size={20} className="text-muted-foreground" />
                    </button>
                  </div>

                  <div className="space-y-3 mb-4">
                    <a href={`mailto:${member.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition">
                      <Mail size={16} />
                      {member.email}
                    </a>
                    {member.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone size={16} />
                        {member.phone}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      member.isActive 
                        ? 'bg-success/20 text-success'
                        : 'bg-muted/20 text-muted-foreground'
                    }`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button className="text-primary hover:underline text-sm font-medium">
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
