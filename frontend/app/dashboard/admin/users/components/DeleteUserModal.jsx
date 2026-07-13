'use client';

import { Trash2 } from 'lucide-react';

export default function DeleteUserModal({ open, user, loading, onClose, onConfirm }) {
  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
            <Trash2 size={32} className="text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Delete User</h2>
          <p className="text-muted-foreground mb-6">
            Are you sure you want to delete <span className="font-semibold text-foreground">{user.name}</span>? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-border hover:bg-muted transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition disabled:opacity-50"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
