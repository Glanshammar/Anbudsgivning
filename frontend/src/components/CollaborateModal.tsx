"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getCompanyUsers,
  getTenderCollaboration,
  createOrUpdateTenderCollaboration,
  removeCollaborator,
  type User,
  type TenderCollaboration,
  type CollaborationPermissions,
} from "@/services/api/collaboration";

interface CollaborateModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenderId: string;
  tenderName: string;
}

const defaultPermissions: CollaborationPermissions = {
  canView: true,
  canEdit: true,
  canMove: false,
  canInviteOthers: false,
  canRemoveCollaborators: false,
};

export default function CollaborateModal({
  isOpen,
  onClose,
  tenderId,
  tenderName,
}: CollaborateModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [collaboration, setCollaboration] =
    useState<TenderCollaboration | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      // Reset state when modal closes
      setSelectedUserIds([]);
      setSearchTerm("");
      setError(null);
    }
  }, [isOpen, tenderId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load company users and existing collaboration in parallel
      const [companyUsers, existingCollaboration] = await Promise.all([
        getCompanyUsers(),
        getTenderCollaboration(tenderId),
      ]);

      setUsers(companyUsers);
      setCollaboration(existingCollaboration);
    } catch (err) {
      console.error("Error loading collaboration data:", err);
      setError("Failed to load collaboration data");
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search term and exclude current collaborators
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.name.toLowerCase().includes(searchTerm.toLowerCase());

    const isNotAlreadyCollaborator = !collaboration?.collaborators.some(
      (collab) => collab.userId === user.id
    );

    return matchesSearch && isNotAlreadyCollaborator;
  });

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleInviteUsers = async () => {
    if (selectedUserIds.length === 0) {
      setError("Please select at least one user to invite");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createOrUpdateTenderCollaboration(
        tenderId,
        selectedUserIds,
        defaultPermissions
      );

      // Reload collaboration data to show updated state
      await loadData();
      setSelectedUserIds([]);

      // Could show success message here
      console.log("Successfully invited users to collaborate");
    } catch (err) {
      console.error("Error inviting users:", err);
      setError("Failed to invite users. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    try {
      await removeCollaborator(tenderId, userId);
      await loadData(); // Reload to show updated state
    } catch (err) {
      console.error("Error removing collaborator:", err);
      setError("Failed to remove collaborator");
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "accepted":
        return "default";
      case "pending":
        return "secondary";
      case "declined":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Collaborate on {tenderName}</SheetTitle>
          <SheetDescription>
            Invite team members to collaborate on this tender.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 p-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {/* Current Collaborators Section */}
          {collaboration && collaboration.collaborators.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Current Collaborators</h3>
              <div className="space-y-2">
                {collaboration.collaborators.map((collaborator) => (
                  <div
                    key={collaborator.userId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {collaborator.user.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {collaborator.user.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {collaborator.user.role.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={getStatusBadgeVariant(collaborator.status)}
                      >
                        {collaborator.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleRemoveCollaborator(collaborator.userId)
                        }
                        className="text-xs"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Collaborators Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Add New Collaborators</h3>

            {/* Search Input */}
            <div className="space-y-1">
              <Label htmlFor="search" className="text-sm">
                Search team members
              </Label>
              <Input
                id="search"
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {/* User List */}
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-gray-500">Loading team members...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center p-4">
                    {searchTerm
                      ? "No users found matching your search"
                      : "No available team members"}
                  </p>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedUserIds.includes(user.id)
                          ? "bg-blue-50 border-blue-200"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                      onClick={() => handleUserToggle(user.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => handleUserToggle(user.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="w-8 h-8 bg-gray-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {user.avatar}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-gray-600">
                          {user.role.name}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected Users Count */}
          {selectedUserIds.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                {selectedUserIds.length} user
                {selectedUserIds.length !== 1 ? "s" : ""} selected for
                invitation
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleInviteUsers}
              disabled={selectedUserIds.length === 0 || submitting}
              className="flex-1"
            >
              {submitting
                ? "Inviting..."
                : `Invite ${selectedUserIds.length || ""} User${
                    selectedUserIds.length !== 1 ? "s" : ""
                  }`}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
