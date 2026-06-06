import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface DeleteResourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    resourceName: string;
    isLoading?: boolean;
}

const DeleteResourceModal: React.FC<DeleteResourceModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    resourceName,
    isLoading = false,
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-red-500" />
                        Delete Resource
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete "{resourceName}"?
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                        This action cannot be undone. All associated flashcards and study data will also be deleted.
                    </p>
                </div>
                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="gap-2"
                    >
                        {isLoading ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4" />
                                Delete Resource
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DeleteResourceModal;
