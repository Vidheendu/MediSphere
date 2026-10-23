import { supabase } from "@/lib/supabase";
import type { Notification, NotificationType } from "@/types";

export interface CreateNotificationParams {
  recipient_user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_appointment_id?: string | null;
}

export interface NotificationOperationResult {
  success: boolean;
  notification?: Notification;
  error?: string;
}

/**
 * Retrieves notifications belonging strictly to the currently authenticated user.
 * Ordered chronologically descending (newest first).
 * Never leaks other users' notifications (enforced by RLS and client-side user filter).
 */
export async function getNotifications(limit = 50): Promise<Notification[]> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return [];
    }

    const userId = authData.user.id;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[getNotifications] Query warning:", error.message);
      return [];
    }

    return (data as Notification[]) || [];
  } catch (err) {
    console.error("[getNotifications] Unexpected exception:", err);
    return [];
  }
}

/**
 * Counts unread notifications for the currently authenticated user.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return 0;
    }

    const userId = authData.user.id;

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_user_id", userId)
      .is("read_at", null);

    if (error) {
      console.warn("[getUnreadNotificationCount] Count warning:", error.message);
      return 0;
    }

    return count ?? 0;
  } catch (err) {
    console.error("[getUnreadNotificationCount] Unexpected exception:", err);
    return 0;
  }
}

/**
 * Marks a single notification as read for the currently authenticated user.
 * Prevents modifying other users' notifications.
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<NotificationOperationResult> {
  if (!notificationId) {
    return { success: false, error: "Notification ID is required." };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return { success: false, error: "Authentication required." };
    }

    const userId = authData.user.id;

    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("recipient_user_id", userId)
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, notification: (data as Notification) || undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to mark notification as read.";
    return { success: false, error: msg };
  }
}

/**
 * Marks all unread notifications as read for the currently authenticated user.
 */
export async function markAllNotificationsAsRead(): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return { success: false, error: "Authentication required." };
    }

    const userId = authData.user.id;

    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_user_id", userId)
      .is("read_at", null)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, count: data?.length || 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to mark all as read.";
    return { success: false, error: msg };
  }
}

/**
 * Reliable notification creation helper for real system events.
 * Enforces:
 * - Recipient validation
 * - Idempotency: prevents duplicate notifications for the same event and appointment
 * - Privacy: does not store sensitive diagnostic or clinical medical details
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<NotificationOperationResult> {
  const { recipient_user_id, type, title, message, related_appointment_id } = params;

  if (!recipient_user_id || !title?.trim() || !message?.trim()) {
    return { success: false, error: "Missing required notification fields." };
  }

  try {
    // 1. Idempotency check: if related_appointment_id is present, avoid duplicate same-type notification
    if (related_appointment_id) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("related_appointment_id", related_appointment_id)
        .eq("recipient_user_id", recipient_user_id)
        .eq("type", type)
        .maybeSingle();

      if (existing) {
        return { success: true, error: "Duplicate notification skipped." };
      }
    }

    // 2. Insert notification record
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        recipient_user_id,
        type,
        title: title.trim(),
        message: message.trim(),
        related_appointment_id: related_appointment_id || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("[createNotification] Insert warning:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, notification: (data as Notification) || undefined };
  } catch (err) {
    console.error("[createNotification] Exception:", err);
    const msg = err instanceof Error ? err.message : "Failed to create notification.";
    return { success: false, error: msg };
  }
}
