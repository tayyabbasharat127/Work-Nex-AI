'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Mail, Phone, MoreVertical, Users, Briefcase, Calendar } from 'lucide-react';
import { userAPI } from '@/lib/api';
import { toast } from 'sonner';

export default function ManagerTeam() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get current user to find their ID
      const user = await userAPI.getMe();
      setCurrentUser(user);
      
      console.log('Current manager user:', user);
      console.log('Manager ID:', user.id);
      
      // Get all users and filter by managerId
      const allUsers = await userAPI.getAll();
      const usersArray = Array.isArray(allUsers) ? allUsers : (allUsers?.users || []);
      
      console.log('All users:', usersArray);
      console.log('Total users count:', usersArray.length);
      
      // Filter team members where managerId matches current user's ID
      // Check both managerId (from backend) and manager_id (mapped)
      const myTeam = usersArray.filter(u => {
        const hasManagerId = u.managerId === user.id || u.manager_id === user.id;
        console.log(`User ${u.firstName} ${u.lastName}: managerId=${u.managerId}, manager_id=${u.manager_id}, matches=${hasManagerId}`);
        return hasManagerId;
      });
      
      console.log('My team members:', myTeam);
      console.log('Team count:', myTeam.length);
      
      setTeamMembers(myTeam);
    } catch (err) {
      console.error('Failed to load team members:', err);
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
        <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-border p-6 z-20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Team</h1>
              <p className="text-muted-foreground mt-1">Manage and view team members information.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-xl">
              <Users size={20} className="text-primary" />
              <span className="font-semibold text-primary">{teamMembers.length} Members</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading team members...</p>
              </div>
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Team Members</h3>
              <p className="text-muted-foreground">
                You don&apos;t have any team members assigned yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamMembers.map((member) => (
                <div key={member.id} className="bg-card border border-border rounded-xl p-6 hover:border-primary transition-all hover:shadow-lg">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                      {member.firstName?.[0]}{member.lastName?.[0]}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold">{member.firstName} {member.lastName}</h3>
                      <p className="text-sm text-muted-foreground">{member.designation || member.role}</p>
                    </div>
                    <button className="p-2 hover:bg-muted rounded-lg transition">
                      <MoreVertical size={20} className="text-muted-foreground" />
                    </button>
                  </div>

                  <div className="space-y-3 mb-4">
                    <a 
                      href={`mailto:${member.email}`} 
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition"
                    >
                      <Mail size={16} />
                      <span className="truncate">{member.email}</span>
                    </a>
                    
                    {member.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone size={16} />
                        {member.phone}
                      </div>
                    )}
                    
                    {member.department && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Briefcase size={16} />
                        {member.department.name}
                      </div>
                    )}
                    
                    {member.joiningDate && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar size={16} />
                        {new Date(member.joiningDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      member.isActive 
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-muted/20 text-muted-foreground'
                    }`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ID: {member.employeeId}
                    </span>
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
