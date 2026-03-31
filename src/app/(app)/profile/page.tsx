"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { usePwaInstall } from "@/lib/pwaStore";
import {
  User,
  Mail,
  CreditCard,
  LogOut,
  Users,
  Plus,
  Copy,
  Check,
  Crown,
  Download,
} from "lucide-react";

export default function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { prompt, isInstalled, install } = usePwaInstall();
  const supabase = createClient();

  const [name, setName] = useState(profile?.name ?? "");
  const [upiId, setUpiId] = useState(profile?.upi_id ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Group state
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<
    { id: string; name: string; email: string; role: string }[]
  >([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setUpiId(profile.upi_id ?? "");
    }
  }, [profile]);

  const loadGroup = useCallback(async () => {
    if (!user) return;

    const { data: membership } = await supabase
      .from("group_members")
      .select("group_id, groups(id, name)")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (membership) {
      setGroupId(membership.group_id);
      setGroupName(
        (membership.groups as unknown as { name: string })?.name ?? ""
      );

      const { data: members } = await supabase
        .from("group_members")
        .select("user_id, role, profiles(id, name, email)")
        .eq("group_id", membership.group_id);

      setGroupMembers(
        (members ?? []).map((m) => ({
          id: m.user_id,
          name: (m.profiles as unknown as { name: string })?.name ?? "User",
          email: (m.profiles as unknown as { email: string })?.email ?? "",
          role: m.role,
        }))
      );
    }
  }, [user, supabase]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ name, upi_id: upiId || null })
      .eq("id", user.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const createGroup = async () => {
    if (!user || !newGroupName.trim()) return;
    setCreating(true);

    const { data: group } = await supabase
      .from("groups")
      .insert({ name: newGroupName.trim(), created_by: user.id })
      .select()
      .single();

    if (group) {
      await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
        role: "admin",
      });

      // Invite by email
      if (inviteEmails.trim()) {
        const emails = inviteEmails
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);

        for (const email of emails) {
          // Check if user exists
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", email)
            .single();

          if (existingProfile) {
            await supabase.from("group_members").insert({
              group_id: group.id,
              user_id: existingProfile.id,
              role: "member",
            });
          }
        }
      }

      setShowCreateGroup(false);
      setNewGroupName("");
      setInviteEmails("");
      loadGroup();
    }
    setCreating(false);
  };

  const joinGroup = async () => {
    if (!user || !joinCode.trim()) return;
    setJoining(true);

    // joinCode is expected to be a group ID
    const { data: group } = await supabase
      .from("groups")
      .select("id")
      .eq("id", joinCode.trim())
      .single();

    if (group) {
      await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
        role: "member",
      });
      setShowJoinGroup(false);
      setJoinCode("");
      loadGroup();
    }
    setJoining(false);
  };

  const copyGroupId = () => {
    if (groupId) {
      navigator.clipboard.writeText(groupId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="px-4 pt-6 space-y-6 max-w-md mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar name={profile?.name ?? "U"} size="lg" />
        <div className="text-left">
          <h1 className="text-2xl font-bold text-text">
            {profile?.name ?? "User"}
          </h1>
          <p className="text-text-muted text-sm">{profile?.email}</p>
        </div>
      </div>

      {/* PWA Install - Only show if not installed and prompt is available */}
      {!isInstalled && prompt && (
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/20 text-primary">
              <Download size={24} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-bold text-text">Install SplitKaro</h3>
              <p className="text-xs text-text-muted">Better performance & quick access</p>
            </div>
            <Button size="sm" onClick={install} className="rounded-xl">
              Install
            </Button>
          </div>
        </Card>
      )}

      {/* Profile Edit */}
      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider text-left">
          Profile
        </h2>
        <Input
          label="Display Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={<User size={16} />}
        />
        <Input
          label="UPI ID (optional)"
          placeholder="yourname@upi"
          value={upiId}
          onChange={(e) => setUpiId(e.target.value)}
          icon={<CreditCard size={16} />}
        />
        <Button
          onClick={saveProfile}
          isLoading={saving}
          fullWidth
          className="gap-2"
        >
          {saved ? (
            <>
              <Check size={16} />
              Saved!
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </Card>

      {/* Group Section */}
      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
          <Users size={14} />
          Your Group
        </h2>

        {groupId ? (
          <>
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-lg font-bold text-text">{groupName}</p>
                <p className="text-xs text-text-dim">
                  {groupMembers.length} members
                </p>
              </div>
              <button
                onClick={copyGroupId}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated text-xs text-text-muted hover:text-text transition-colors"
              >
                {copied ? (
                  <Check size={12} className="text-success" />
                ) : (
                  <Copy size={12} />
                )}
                {copied ? "Copied!" : "Copy ID"}
              </button>
            </div>

            <div className="space-y-2">
              {groupMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-xl"
                >
                  <Avatar name={member.name} size="sm" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-text">
                      {member.name}
                      {member.id === user?.id && (
                        <span className="text-text-muted"> (you)</span>
                      )}
                    </p>
                    <p className="text-xs text-text-dim">{member.email}</p>
                  </div>
                  {member.role === "admin" && (
                    <Badge variant="primary">
                      <Crown size={10} className="mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-text-muted text-sm text-left">
              Create a group or join an existing one to start splitting
              expenses.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setShowCreateGroup(true)}
                className="gap-1.5"
              >
                <Plus size={16} />
                Create
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowJoinGroup(true)}
                className="gap-1.5"
              >
                <Users size={16} />
                Join
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Sign Out */}
      <Button
        variant="danger"
        fullWidth
        onClick={signOut}
        className="gap-2"
      >
        <LogOut size={16} />
        Sign Out
      </Button>

      {/* Create Group Modal */}
      <Modal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        title="Create Group"
      >
        <div className="space-y-4">
          <Input
            label="Group Name"
            placeholder="e.g. Room 404 🏠"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            icon={<Users size={16} />}
          />
          <Input
            label="Invite Roommates (emails, comma-separated)"
            placeholder="alice@email.com, bob@email.com"
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
            icon={<Mail size={16} />}
          />
          <p className="text-xs text-text-dim text-left">
            They must have signed up first. You can also share the Group ID
            later.
          </p>
          <Button
            onClick={createGroup}
            isLoading={creating}
            fullWidth
            size="lg"
          >
            Create Group
          </Button>
        </div>
      </Modal>

      {/* Join Group Modal */}
      <Modal
        isOpen={showJoinGroup}
        onClose={() => setShowJoinGroup(false)}
        title="Join Group"
      >
        <div className="space-y-4">
          <Input
            label="Group ID"
            placeholder="Paste the group ID here"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <p className="text-xs text-text-dim text-left">
            Ask your roommate for the Group ID from their Profile page.
          </p>
          <Button
            onClick={joinGroup}
            isLoading={joining}
            fullWidth
            size="lg"
          >
            Join Group
          </Button>
        </div>
      </Modal>
    </div>
  );
}
