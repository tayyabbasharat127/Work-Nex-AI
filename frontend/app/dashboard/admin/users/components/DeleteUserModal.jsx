'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function DeleteUserModal({ open, user, loading, onClose, onConfirm }) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
            <Trash2 size={30} className="text-destructive" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">Delete User</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to delete <span className="font-semibold text-foreground">{user.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 sm:justify-stretch">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm} disabled={loading} className="flex-1">
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
