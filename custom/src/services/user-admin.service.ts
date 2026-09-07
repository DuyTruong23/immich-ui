import { mdiLock, mdiLockOpen } from "@mdi/js";
import type { MessageFormatter } from "svelte-i18n";
import { authManager } from "$lib/managers/auth-manager.svelte";
import { getStoredAccessToken } from "$custom/hooks/access-token";
import { modalManager, toastManager, type ActionItem } from "@immich/ui";
import { handleError } from "$lib/utils/handle-error";
import { getFormatter } from "$lib/utils/i18n";
import type { UserAdminResponseDto } from "@immich/sdk";

export const getUserAdminActionsOverride = (
  $t: MessageFormatter,
  user: UserAdminResponseDto,
  onSuccess?: () => void,
) => {
  const Block: ActionItem = {
    icon: mdiLock,
    title: $t("block_user") || "Khóa tài khoản",
    color: "danger",
    $if: () => authManager.user.id !== user.id && !user.deletedAt,
    onAction: () => handleBlockUserAdmin(user, onSuccess),
  };

  const Unblock: ActionItem = {
    icon: mdiLockOpen,
    title: $t("unblock_user") || "Mở khóa tài khoản",
    color: "primary",
    $if: () => authManager.user.id !== user.id && !user.deletedAt,
    onAction: () => handleUnblockUserAdmin(user, onSuccess),
  };

  return { Block, Unblock };
};

const handleBlockUserAdmin = async (
  user: UserAdminResponseDto,
  onSuccess?: () => void,
) => {
  const $t = await getFormatter();
  const prompt =
    $t("admin.confirm_user_block", { values: { user: user.name } }) ||
    `Bạn có chắc chắn muốn khóa tài khoản ${user.name}?`;
  const success = await modalManager.showDialog({ prompt });
  if (!success) {
    return;
  }

  try {
    const response = await fetch("/api/admin-block-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        action: "block",
        accessToken: getStoredAccessToken(),
      }),
    });

    const result = (await response.json()) as {
      ok?: boolean;
      blocked?: boolean;
      error?: string;
    };
    if (!result.ok || !result.blocked) {
      throw new Error(result.error || "Failed to block user");
    }

    toastManager.primary(
      $t("admin.user_blocked_successfully", { values: { user: user.name } }) ||
        `Đã khóa tài khoản ${user.name}`,
    );
    onSuccess?.();
  } catch (error) {
    handleError(
      error,
      $t("errors.unable_to_block_user") || "Không thể khóa tài khoản",
    );
  }
};

const handleUnblockUserAdmin = async (
  user: UserAdminResponseDto,
  onSuccess?: () => void,
) => {
  const $t = await getFormatter();
  const prompt =
    $t("admin.confirm_user_unblock", { values: { user: user.name } }) ||
    `Bạn có chắc chắn muốn mở khóa tài khoản ${user.name}?`;
  const success = await modalManager.showDialog({ prompt });
  if (!success) {
    return;
  }

  try {
    const response = await fetch("/api/admin-block-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        action: "unblock",
        accessToken: getStoredAccessToken(),
      }),
    });

    const result = (await response.json()) as {
      ok?: boolean;
      blocked?: boolean;
      error?: string;
    };
    if (!result.ok || result.blocked) {
      throw new Error(result.error || "Failed to unblock user");
    }

    toastManager.primary(
      $t("admin.user_unblocked_successfully", {
        values: { user: user.name },
      }) || `Đã mở khóa tài khoản ${user.name}`,
    );
    onSuccess?.();
  } catch (error) {
    handleError(
      error,
      $t("errors.unable_to_unblock_user") || "Không thể mở khóa tài khoản",
    );
  }
};
