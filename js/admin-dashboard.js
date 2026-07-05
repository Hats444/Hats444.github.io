(function () {
  'use strict';

  const TOKEN_KEY = 'hats444_admin_token';
  const Api = () => window.Hats444AnalyticsApi;

  const loginSection = document.getElementById('login-section');
  const dashSection = document.getElementById('dash-section');
  const passwordInput = document.getElementById('admin-password');
  const loginError = document.getElementById('login-error');
  const rangeSelect = document.getElementById('range-days');

  let chartDay = null;
  let chartHour = null;

  function getToken() {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  function setToken(token) {
    try {
      if (token) sessionStorage.setItem(TOKEN_KEY, token);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }

  function showLogin(msg) {
    loginSection.classList.remove('hidden');
    dashSection.classList.add('hidden');
    if (msg) {
      loginError.textContent = msg;
      loginError.classList.remove('hidden');
    } else {
      loginError.classList.add('hidden');
    }
  }

  function showDash() {
    loginSection.classList.add('hidden');
    dashSection.classList.remove('hidden');
    loginError.classList.add('hidden');
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR');
  }

  function renderBreakdown(container, breakdown) {
    container.innerHTML = '';
    const sections = [
      ['Navegador', breakdown.browser],
      ['Sistema', breakdown.os],
      ['Dispositivo', breakdown.device],
      ['País', breakdown.country],
      ['Referer', breakdown.referer],
    ];

    for (const [title, items] of sections) {
      const box = document.createElement('div');
      box.className = 'breakdown-list';
      box.innerHTML = '<h3>' + title + '</h3>';
      const ul = document.createElement('ul');
      const list = (items || []).slice(0, 8);
      if (!list.length) {
        const li = document.createElement('li');
        li.innerHTML = '<span>—</span><span>0</span>';
        ul.appendChild(li);
      } else {
        for (const item of list) {
          const li = document.createElement('li');
          const name = item.name.length > 28 ? item.name.slice(0, 28) + '…' : item.name;
          li.innerHTML = '<span>' + name + '</span><span>' + item.count + '</span>';
          ul.appendChild(li);
        }
      }
      box.appendChild(ul);
      container.appendChild(box);
    }
  }

  function renderCharts(data) {
    const dayLabels = (data.by_day || []).map((d) => d.date.slice(5));
    const dayValues = (data.by_day || []).map((d) => d.count);

    const hourLabels = (data.by_hour || []).map((h) => String(h.hour).padStart(2, '0') + 'h');
    const hourValues = (data.by_hour || []).map((h) => h.count);

    const chartOpts = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: '#6a6a6a', font: { family: 'JetBrains Mono', size: 9 } },
          grid: { color: 'rgba(255,255,255,0.06)' },
        },
        y: {
          ticks: { color: '#6a6a6a', font: { family: 'JetBrains Mono', size: 9 } },
          grid: { color: 'rgba(255,255,255,0.06)' },
          beginAtZero: true,
        },
      },
    };

    const green = 'rgba(74, 222, 128, 0.65)';
    const greenBorder = 'rgba(74, 222, 128, 0.9)';

    if (chartDay) chartDay.destroy();
    chartDay = new Chart(document.getElementById('chart-day'), {
      type: 'bar',
      data: {
        labels: dayLabels,
        datasets: [{ data: dayValues, backgroundColor: green, borderColor: greenBorder, borderWidth: 1 }],
      },
      options: chartOpts,
    });

    if (chartHour) chartHour.destroy();
    chartHour = new Chart(document.getElementById('chart-hour'), {
      type: 'line',
      data: {
        labels: hourLabels,
        datasets: [{
          data: hourValues,
          borderColor: greenBorder,
          backgroundColor: 'rgba(74, 222, 128, 0.12)',
          fill: true,
          tension: 0.3,
        }],
      },
      options: chartOpts,
    });
  }

  function renderRecent(rows) {
    const tbody = document.getElementById('recent-body');
    tbody.innerHTML = '';
    for (const row of rows || []) {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + fmtDate(row.entered_at) + '</td>' +
        '<td>' + (row.browser || '—') + '</td>' +
        '<td>' + (row.os || '—') + '</td>' +
        '<td>' + (row.device || '—') + '</td>' +
        '<td>' + (row.country || '—') + '</td>' +
        '<td>' + (row.city || '—') + '</td>' +
        '<td>' + ((row.referer || '—').slice(0, 40)) + '</td>';
      tbody.appendChild(tr);
    }
  }

  async function loadDashboard() {
    const token = getToken();
    if (!token) {
      showLogin();
      return;
    }

    if (!Api().isConfigured()) {
      showLogin('Configure js/config.js com Supabase URL e anon key.');
      return;
    }

    const days = rangeSelect.value;
    const result = await Api().fetchAdminData(token, { days });

    if (!result.ok) {
      setToken(null);
      showLogin(result.data?.error === 'unauthorized' ? 'Sessão expirada.' : 'Falha ao carregar dados.');
      return;
    }

    showDash();
    const data = result.data;

    document.getElementById('kpi-online').textContent = fmt(data.stats?.online);
    document.getElementById('kpi-visitors').textContent = fmt(data.stats?.visitors);
    document.getElementById('kpi-accesses').textContent = fmt(data.stats?.accesses);
    document.getElementById('kpi-range').textContent = fmt(data.total_in_range);

    renderCharts(data);
    renderBreakdown(document.getElementById('breakdown-grid'), data.breakdown || {});
    renderRecent(data.recent);
  }

  document.getElementById('btn-login').addEventListener('click', async () => {
    const password = passwordInput.value;
    if (!password) {
      showLogin('Informe a senha.');
      return;
    }

    const result = await Api().adminLogin(password);
    if (!result.ok || !result.data?.token) {
      showLogin('Senha inválida.');
      return;
    }

    setToken(result.data.token);
    passwordInput.value = '';
    await loadDashboard();
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    setToken(null);
    showLogin();
  });

  document.getElementById('btn-refresh').addEventListener('click', loadDashboard);
  rangeSelect.addEventListener('change', loadDashboard);

  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-login').click();
  });

  if (getToken()) {
    loadDashboard();
  } else {
    showLogin();
  }
})();
