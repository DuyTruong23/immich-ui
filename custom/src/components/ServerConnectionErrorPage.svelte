<script lang="ts">
  import { SERVER_CONNECTION_MESSAGE } from '$custom/utils/server-connection-error';

  interface Props {
    code?: number;
    message?: string;
  }

  let { code = 505, message = SERVER_CONNECTION_MESSAGE }: Props = $props();
</script>

<div class="pg-server-error" role="alert" aria-live="polite">
  <div class="pg-server-error__content">
    <p class="pg-server-error__code" aria-hidden="true">{code}</p>
    <h1 class="pg-server-error__title">Hệ thống đang cập nhật dữ liệu.</h1>
    <p class="pg-server-error__description">{message}</p>
  </div>
</div>
