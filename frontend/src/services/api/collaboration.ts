// Collaboration API for managing tender collaboration features
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  level: number; // 1 = Senior, 2 = Manager, 3 = Junior, etc.
}

export interface TenderCollaboration {
  tenderId: string;
  owner: string; // User ID who created the collaboration
  collaborators: TenderCollaborator[];
  createdAt: string;
  updatedAt: string;
}

export interface TenderCollaborator {
  userId: string;
  user: User;
  invitedBy: string; // User ID who sent the invitation
  invitedAt: string;
  status: CollaborationStatus;
  permissions: CollaborationPermissions;
}

export type CollaborationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "removed";

export interface CollaborationPermissions {
  canView: boolean;
  canEdit: boolean;
  canMove: boolean;
  canInviteOthers: boolean;
  canRemoveCollaborators: boolean;
}

// Configuration
const USE_DUMMY = true;
const API_BASE_URL = "http://localhost:5000";
const REQUEST_TIMEOUT = 15000;

// Dummy user roles
const dummyUserRoles: UserRole[] = [
  {
    id: "senior-manager",
    name: "Senior Manager",
    permissions: ["view", "edit", "move", "invite", "remove", "approve"],
    level: 1,
  },
  {
    id: "project-manager",
    name: "Project Manager",
    permissions: ["view", "edit", "move", "invite"],
    level: 2,
  },
  {
    id: "senior-consultant",
    name: "Senior Consultant",
    permissions: ["view", "edit", "move"],
    level: 3,
  },
  {
    id: "consultant",
    name: "Consultant",
    permissions: ["view", "edit"],
    level: 4,
  },
  {
    id: "junior-consultant",
    name: "Junior Consultant",
    permissions: ["view"],
    level: 5,
  },
];

// Dummy users from the same company
const dummyUsers: User[] = [
  {
    id: "user-1",
    name: "Anna Svensson",
    email: "anna.svensson@company.se",
    role: dummyUserRoles[0], // Senior Manager
    avatar: "AS",
  },
  {
    id: "user-2",
    name: "Erik Larsson",
    email: "erik.larsson@company.se",
    role: dummyUserRoles[1], // Project Manager
    avatar: "EL",
  },
  {
    id: "user-3",
    name: "Maria Johansson",
    email: "maria.johansson@company.se",
    role: dummyUserRoles[2], // Senior Consultant
    avatar: "MJ",
  },
  {
    id: "user-4",
    name: "Lars Andersson",
    email: "lars.andersson@company.se",
    role: dummyUserRoles[1], // Project Manager
    avatar: "LA",
  },
  {
    id: "user-5",
    name: "Sofia Nilsson",
    email: "sofia.nilsson@company.se",
    role: dummyUserRoles[3], // Consultant
    avatar: "SN",
  },
  {
    id: "user-6",
    name: "Johan Petersson",
    email: "johan.petersson@company.se",
    role: dummyUserRoles[2], // Senior Consultant
    avatar: "JP",
  },
  {
    id: "user-7",
    name: "Emma Lindqvist",
    email: "emma.lindqvist@company.se",
    role: dummyUserRoles[4], // Junior Consultant
    avatar: "EL2",
  },
  {
    id: "user-8",
    name: "Oliver Engström",
    email: "oliver.engstrom@company.se",
    role: dummyUserRoles[3], // Consultant
    avatar: "OE",
  },
];

// Dummy collaborations data
const dummyCollaborations: TenderCollaboration[] = [
  {
    tenderId: "Projekt 2",
    owner: "user-1",
    collaborators: [
      {
        userId: "user-2",
        user: dummyUsers[1],
        invitedBy: "user-1",
        invitedAt: "2025-01-20T10:00:00Z",
        status: "accepted",
        permissions: {
          canView: true,
          canEdit: true,
          canMove: true,
          canInviteOthers: false,
          canRemoveCollaborators: false,
        },
      },
      {
        userId: "user-3",
        user: dummyUsers[2],
        invitedBy: "user-1",
        invitedAt: "2025-01-20T10:05:00Z",
        status: "pending",
        permissions: {
          canView: true,
          canEdit: true,
          canMove: false,
          canInviteOthers: false,
          canRemoveCollaborators: false,
        },
      },
    ],
    createdAt: "2025-01-20T10:00:00Z",
    updatedAt: "2025-01-20T10:05:00Z",
  },
];

/**
 * Custom error class for collaboration API errors
 */
class CollaborationApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = "CollaborationApiError";
    Error.captureStackTrace(this, CollaborationApiError);
  }
}

/**
 * Get all users from the same company (available for collaboration)
 */
export async function getCompanyUsers(): Promise<User[]> {
  console.log("🔄 Fetching company users...");

  if (USE_DUMMY) {
    console.log("✅ Dummy mode: Returning company users");
    return new Promise<User[]>((resolve) =>
      setTimeout(() => resolve(dummyUsers), 300)
    );
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/users/company`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new CollaborationApiError("Authentication required", 401);
      }
      throw new CollaborationApiError(
        `Failed to fetch company users: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    console.log("✅ Successfully fetched company users");
    return data.users || [];
  } catch (error) {
    console.error("❌ Error fetching company users:", error);
    throw error;
  }
}

/**
 * Get collaboration details for a specific tender
 */
export async function getTenderCollaboration(
  tenderId: string
): Promise<TenderCollaboration | null> {
  console.log(`🔄 Fetching collaboration for tender: ${tenderId}...`);

  if (USE_DUMMY) {
    console.log("✅ Dummy mode: Returning tender collaboration");
    const collaboration = dummyCollaborations.find(
      (c) => c.tenderId === tenderId
    );
    return new Promise<TenderCollaboration | null>((resolve) =>
      setTimeout(() => resolve(collaboration || null), 300)
    );
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/collaboration/tender/${encodeURIComponent(
        tenderId
      )}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No collaboration exists yet
      }
      if (response.status === 401) {
        throw new CollaborationApiError("Authentication required", 401);
      }
      throw new CollaborationApiError(
        `Failed to fetch tender collaboration: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    console.log(
      `✅ Successfully fetched collaboration for tender: ${tenderId}`
    );
    return data.collaboration || null;
  } catch (error) {
    console.error(
      `❌ Error fetching collaboration for tender ${tenderId}:`,
      error
    );
    throw error;
  }
}

/**
 * Create or update tender collaboration
 */
export async function createOrUpdateTenderCollaboration(
  tenderId: string,
  collaboratorUserIds: string[],
  permissions: CollaborationPermissions
): Promise<TenderCollaboration> {
  console.log(`🔄 Creating/updating collaboration for tender: ${tenderId}...`);

  if (USE_DUMMY) {
    console.log("✅ Dummy mode: Creating/updating tender collaboration");

    const existingIndex = dummyCollaborations.findIndex(
      (c) => c.tenderId === tenderId
    );
    const now = new Date().toISOString();

    // Get existing collaborators or start with empty array
    const existingCollaborators =
      existingIndex >= 0
        ? dummyCollaborations[existingIndex].collaborators
        : [];

    // Create new collaborators only for users not already collaborating
    const newCollaborators: TenderCollaborator[] = collaboratorUserIds
      .filter(
        (userId) =>
          !existingCollaborators.some((collab) => collab.userId === userId)
      )
      .map((userId) => {
        const user = dummyUsers.find((u) => u.id === userId);
        if (!user)
          throw new CollaborationApiError(`User not found: ${userId}`, 404);

        return {
          userId,
          user,
          invitedBy: "current-user", // Would be actual current user ID
          invitedAt: now,
          status: "pending",
          permissions,
        };
      });

    // Combine existing and new collaborators
    const allCollaborators = [...existingCollaborators, ...newCollaborators];

    const collaboration: TenderCollaboration = {
      tenderId,
      owner: "current-user", // Would be actual current user ID
      collaborators: allCollaborators,
      createdAt:
        existingIndex >= 0 ? dummyCollaborations[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      dummyCollaborations[existingIndex] = collaboration;
    } else {
      dummyCollaborations.push(collaboration);
    }

    return new Promise<TenderCollaboration>((resolve) =>
      setTimeout(() => resolve(collaboration), 500)
    );
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/collaboration/tender/${encodeURIComponent(
        tenderId
      )}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          collaboratorUserIds,
          permissions,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new CollaborationApiError("Authentication required", 401);
      }
      const errorData = await response.json().catch(() => ({}));
      throw new CollaborationApiError(
        errorData.error ||
          `Failed to create/update collaboration: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    console.log(
      `✅ Successfully created/updated collaboration for tender: ${tenderId}`
    );
    return data.collaboration;
  } catch (error) {
    console.error(
      `❌ Error creating/updating collaboration for tender ${tenderId}:`,
      error
    );
    throw error;
  }
}

/**
 * Remove a collaborator from a tender
 */
export async function removeCollaborator(
  tenderId: string,
  collaboratorUserId: string
): Promise<void> {
  console.log(
    `🔄 Removing collaborator ${collaboratorUserId} from tender: ${tenderId}...`
  );

  if (USE_DUMMY) {
    console.log("✅ Dummy mode: Removing collaborator");

    const collaborationIndex = dummyCollaborations.findIndex(
      (c) => c.tenderId === tenderId
    );
    if (collaborationIndex >= 0) {
      const collaboration = dummyCollaborations[collaborationIndex];
      collaboration.collaborators = collaboration.collaborators.filter(
        (c) => c.userId !== collaboratorUserId
      );
      collaboration.updatedAt = new Date().toISOString();
    }

    return new Promise<void>((resolve) => setTimeout(() => resolve(), 300));
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/collaboration/tender/${encodeURIComponent(
        tenderId
      )}/collaborator/${collaboratorUserId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new CollaborationApiError("Authentication required", 401);
      }
      throw new CollaborationApiError(
        `Failed to remove collaborator: ${response.statusText}`,
        response.status
      );
    }

    console.log(
      `✅ Successfully removed collaborator ${collaboratorUserId} from tender: ${tenderId}`
    );
  } catch (error) {
    console.error(
      `❌ Error removing collaborator from tender ${tenderId}:`,
      error
    );
    throw error;
  }
}

/**
 * Update collaborator permissions
 */
export async function updateCollaboratorPermissions(
  tenderId: string,
  collaboratorUserId: string,
  permissions: CollaborationPermissions
): Promise<void> {
  console.log(
    `🔄 Updating permissions for collaborator ${collaboratorUserId} on tender: ${tenderId}...`
  );

  if (USE_DUMMY) {
    console.log("✅ Dummy mode: Updating collaborator permissions");

    const collaboration = dummyCollaborations.find(
      (c) => c.tenderId === tenderId
    );
    if (collaboration) {
      const collaborator = collaboration.collaborators.find(
        (c) => c.userId === collaboratorUserId
      );
      if (collaborator) {
        collaborator.permissions = permissions;
        collaboration.updatedAt = new Date().toISOString();
      }
    }

    return new Promise<void>((resolve) => setTimeout(() => resolve(), 300));
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/collaboration/tender/${encodeURIComponent(
        tenderId
      )}/collaborator/${collaboratorUserId}/permissions`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ permissions }),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new CollaborationApiError("Authentication required", 401);
      }
      throw new CollaborationApiError(
        `Failed to update collaborator permissions: ${response.statusText}`,
        response.status
      );
    }

    console.log(
      `✅ Successfully updated permissions for collaborator ${collaboratorUserId} on tender: ${tenderId}`
    );
  } catch (error) {
    console.error(
      `❌ Error updating collaborator permissions on tender ${tenderId}:`,
      error
    );
    throw error;
  }
}
