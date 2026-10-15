const $ = (id) => document.getElementById(id);
let adminKey = '';
let allReports = [];
let toastTimer;

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}
function openDialog(id) { $(id).showModal(); }
function closeDialog(id) { $(id).close(); }
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}
function statusClass(status) {
  if (status === 'Resolved') return 'resolved';
  if (status === 'In Progress') return 'in-progress';
  if (status === 'Rejected') return 'rejected';
  return '';
}
function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}
async function api(url, options = {}) {
  const response = await fetch(url, options);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Request failed. Please try again.');
  return result;
}
async function loadReports() {
  const query = new URLSearchParams();
  if ($('search').value.trim()) query.set('search', $('search').value.trim());
  if ($('statusFilter').value) query.set('status', $('statusFilter').value);
  try {
    const result = await api('/api/reports?' + query.toString());
    allReports = result.reports || [];
    $('total').textContent = result.stats.total;
    $('progress').textContent = result.stats.inProgress;
    $('resolved').textContent = result.stats.resolved;
    renderReports(allReports);
  } catch (error) {
    $('reports').innerHTML = `<div class="card empty">${escapeHtml(error.message)} Make sure the server is running.</div>`;
  }
}
function renderReports(reports) {
  const box = $('reports');
  if (!reports.length) {
    box.innerHTML = '<div class="card empty">No reports found. Submit the first campus issue.</div>';
    return;
  }
  box.innerHTML = reports.slice(0, 30).map(report => `
    <article class="card report">
      <div>
        <h3>${escapeHtml(report.category)} — ${escapeHtml(report.location)}</h3>
        <p>${escapeHtml(report.description)}</p>
        ${report.photoUrl ? `<a href="${escapeHtml(report.photoUrl)}" target="_blank" rel="noopener"><img class="report-photo" src="${escapeHtml(report.photoUrl)}" alt="Photo attached to ${escapeHtml(report.id)}"></a>` : ''}
        <div class="report-meta">Report ID: <b>${escapeHtml(report.id)}</b> · ${escapeHtml(formatDate(report.createdAt))}</div>
      </div>
      <div class="report-side"><span class="badge ${statusClass(report.status)}">${escapeHtml(report.status)}</span><button class="btn btn-light details-btn" data-report="${escapeHtml(report.id)}">Track report</button></div>
    </article>`).join('');
  box.querySelectorAll('.details-btn').forEach(button => button.addEventListener('click', () => showReportDetails(button.dataset.report)));
}
async function showReportDetails(id) {
  try {
    const { report } = await api('/api/reports/' + encodeURIComponent(id));
    const updates = (report.updates || []).map(item => `${item.status} — ${formatDate(item.at)}${item.note ? '\n' + item.note : ''}`).join('\n\n');
    alert(`Report ${report.id}\n\nCategory: ${report.category}\nLocation: ${report.location}\nSubmitted by: ${report.name}\nStatus: ${report.status}\n\nUpdate history:\n${updates || 'No updates yet.'}`);
  } catch (error) { showToast(error.message); }
}
function openReport() {
  $('formMessage').textContent = '';
  $('reportForm').reset();
  openDialog('reportDialog');
}
$('reportTop').addEventListener('click', openReport);
$('reportHero').addEventListener('click', openReport);
$('quickReport').addEventListener('click', openReport);
$('myComplaints').addEventListener('click', () => $('reportsSection').scrollIntoView({behavior:'smooth'}));
$('howButton').addEventListener('click', () => openDialog('infoDialog'));
$('adminToggle').addEventListener('click', () => openDialog('adminDialog'));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(button.dataset.close)));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
}));
$('search').addEventListener('input', () => {
  clearTimeout(window.searchDelay);
  window.searchDelay = setTimeout(loadReports, 250);
});
$('statusFilter').addEventListener('change', loadReports);

$('reportForm').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  button.textContent = 'Submitting…';
  $('formMessage').textContent = '';
  try {
    const formData = new FormData(event.currentTarget);
    const result = await api('/api/reports', { method:'POST', body:formData });
    closeDialog('reportDialog');
    showToast(`Report submitted. Your ID is ${result.report.id}`);
    await loadReports();
  } catch (error) {
    $('formMessage').textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = 'Submit Complaint';
  }
});

$('adminKeyForm').addEventListener('submit', event => {
  event.preventDefault();
  adminKey = $('adminKey').value;
  $('adminTools').hidden = false;
  showToast('Admin tools unlocked in this browser session.');
});
$('statusForm').addEventListener('submit', async event => {
  event.preventDefault();
  $('adminMessage').textContent = '';
  try {
    const result = await api('/api/reports/' + encodeURIComponent($('adminReportId').value.trim()) + '/status', {
      method:'PATCH',
      headers:{'Content-Type':'application/json','x-admin-key':adminKey},
      body:JSON.stringify({status:$('newStatus').value,note:$('adminNote').value})
    });
    $('adminMessage').textContent = `Updated ${result.report.id} to ${result.report.status}.`;
    $('adminNote').value = '';
    await loadReports();
  } catch (error) {
    $('adminMessage').textContent = error.message;
  }
});
loadReports();
