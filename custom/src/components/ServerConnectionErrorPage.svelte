<script lang="ts">
  interface Props {
    code?: number;
  }

  let { code = 505 }: Props = $props();
</script>

<div class="pg-server-error">
  <svg class="pg-server-error__scene" viewBox="0 0 800 600" role="img" aria-labelledby="pg-server-error-title">
    <title id="pg-server-error-title">Lỗi kết nối server {code}</title>
    <defs>
      <linearGradient id="pg-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#5b2fae" />
        <stop offset="55%" stop-color="#3a1f7a" />
        <stop offset="100%" stop-color="#24104f" />
      </linearGradient>
      <linearGradient id="pg-water" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2a1458" />
        <stop offset="100%" stop-color="#160832" />
      </linearGradient>
      <linearGradient id="pg-btn" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#ff6b8a" />
        <stop offset="100%" stop-color="#ff4d6d" />
      </linearGradient>
    </defs>

    <rect width="800" height="600" fill="url(#pg-sky)" />

    {#each Array(18) as _, i}
      <circle cx={(i * 47 + 20) % 780} cy={(i * 31 + 15) % 260} r="1.5" fill="#fff" opacity="0.55" />
    {/each}

    {#each Array(8) as _, i}
      <g transform="translate({(i * 97 + 40) % 760}, {(i * 53 + 30) % 220})" opacity="0.45">
        <path d="M0 -4 L0 4 M-4 0 L4 0" stroke="#fff" stroke-width="1.2" />
      </g>
    {/each}

    <ellipse cx="120" cy="110" rx="42" ry="42" fill="#6b3fbf" opacity="0.35" />
    <ellipse cx="680" cy="90" rx="28" ry="28" fill="#8b5fd4" opacity="0.3" />
    <ellipse cx="620" cy="170" rx="18" ry="18" fill="#4f2d96" opacity="0.45" />

    <ellipse cx="400" cy="250" rx="320" ry="70" fill="#6a3fbf" opacity="0.22" />
    <ellipse cx="400" cy="235" rx="260" ry="55" fill="#7d4fd0" opacity="0.18" />

    <text
      x="400"
      y="290"
      text-anchor="middle"
      fill="#fff"
      font-size="132"
      font-weight="700"
      font-family="system-ui, -apple-system, Segoe UI, sans-serif"
      letter-spacing="-4"
    >
      {code}
    </text>

    <ellipse cx="400" cy="330" rx="70" ry="70" fill="#1f1147" opacity="0.85" />
    <ellipse cx="400" cy="330" rx="70" ry="70" fill="none" stroke="#5f3aa8" stroke-width="3" opacity="0.6" />
    <path d="M330 330 Q400 300 470 330" fill="none" stroke="#7b55c8" stroke-width="2" opacity="0.5" />

    <polygon points="300,360 340,360 320,320" fill="#2a1458" />
    <polygon points="470,360 510,360 490,320" fill="#2a1458" />

    <g stroke="#2f1860" stroke-width="3">
      <line x1="170" y1="360" x2="170" y2="300" />
      <line x1="630" y1="360" x2="630" y2="295" />
      <line x1="720" y1="360" x2="720" y2="305" />
    </g>

    {#each [
      { cx: 170, cy: 285, r: 18, fill: '#c44fd8' },
      { cx: 155, cy: 270, r: 14, fill: '#9b4fd8' },
      { cx: 185, cy: 268, r: 12, fill: '#7a3fbf' },
      { cx: 630, cy: 280, r: 16, fill: '#b84fd0' },
      { cx: 615, cy: 265, r: 13, fill: '#8f4fd8' },
      { cx: 645, cy: 262, r: 11, fill: '#6d3fbf' },
      { cx: 720, cy: 288, r: 15, fill: '#a84fd0' },
      { cx: 705, cy: 273, r: 12, fill: '#844fd8' },
    ] as bubble}
      <circle cx={bubble.cx} cy={bubble.cy} r={bubble.r} fill={bubble.fill} opacity="0.9" />
    {/each}

    <rect x="0" y="380" width="800" height="220" fill="url(#pg-water)" />

    {#each Array(12) as _, i}
      <rect
        x={(i * 68 + 10) % 760}
        y={410 + ((i * 17) % 80)}
        width={30 + ((i * 13) % 50)}
        height="6"
        rx="3"
        fill="#5a2f9f"
        opacity="0.35"
      />
    {/each}

    <rect x="110" y="500" width="578" height="44" rx="22" fill="url(#pg-btn)" />
    <text
      x="400"
      y="528"
      text-anchor="middle"
      fill="#fff"
      font-size="15"
      font-weight="600"
      font-family="system-ui, -apple-system, Segoe UI, sans-serif"
    >
      Hệ thống đang cập nhật dữ liệu, vui lòng quay lại sau 17:30 ngày 13/8/2026.
    </text>
  </svg>
</div>
