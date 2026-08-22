/* ==========================================================================
   HISAB — charts.js
   Thin wrapper around Chart.js for the dashboard pie / line visualisations.
   ========================================================================== */

const HisabCharts = (() => {
  const PALETTE = ['#27AE60', '#F39C12', '#2C3E50', '#3498db', '#9b59b6', '#e74c3c', '#1abc9c', '#95a5a6', '#e67e22', '#16a085'];
  const registry = {};

  function themeTextColor() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.getAttribute('data-theme') !== 'light');
    return dark ? '#ECF0F1' : '#2C3E50';
  }

  function renderPie(canvasId, labels, data, opts = {}) {
    const el = document.getElementById(canvasId);
    if (!el || typeof Chart === 'undefined') return null;
    if (registry[canvasId]) registry[canvasId].destroy();
    registry[canvasId] = new Chart(el, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: PALETTE, borderWidth: 2, borderColor: getComputedStyle(document.body).getPropertyValue('--color-surface') || '#fff' }]
      },
      options: {
        cutout: '62%',
        plugins: {
          legend: { display: opts.showLegend ?? false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: NRs ${Number(ctx.raw).toLocaleString('en-IN')}`
            }
          }
        },
        maintainAspectRatio: false
      }
    });
    return registry[canvasId];
  }

  function renderLine(canvasId, labels, datasets, opts = {}) {
    const el = document.getElementById(canvasId);
    if (!el || typeof Chart === 'undefined') return null;
    if (registry[canvasId]) registry[canvasId].destroy();
    const color = themeTextColor();
    registry[canvasId] = new Chart(el, {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map((ds, i) => ({
          tension: 0.35,
          fill: true,
          borderColor: PALETTE[i % PALETTE.length],
          backgroundColor: PALETTE[i % PALETTE.length] + '22',
          pointRadius: 3,
          borderWidth: 2,
          ...ds
        }))
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: datasets.length > 1, labels: { color } } },
        scales: {
          x: { ticks: { color }, grid: { display: false } },
          y: { ticks: { color }, grid: { color: 'rgba(128,128,128,0.15)' } }
        }
      }
    });
    return registry[canvasId];
  }

  function renderBar(canvasId, labels, data, opts = {}) {
    const el = document.getElementById(canvasId);
    if (!el || typeof Chart === 'undefined') return null;
    if (registry[canvasId]) registry[canvasId].destroy();
    const color = themeTextColor();
    registry[canvasId] = new Chart(el, {
      type: 'bar',
      data: { labels, datasets: [{ data, backgroundColor: opts.color || '#27AE60', borderRadius: 6, maxBarThickness: 34 }] },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color }, grid: { display: false } },
          y: { ticks: { color }, grid: { color: 'rgba(128,128,128,0.15)' } }
        }
      }
    });
    return registry[canvasId];
  }

  return { renderPie, renderLine, renderBar, PALETTE };
})();
