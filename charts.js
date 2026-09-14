// Chart Rendering Manager for CATEST Enterprise QA System
window.CatCharts = {
  instances: {},

  destroyAll: function() {
    Object.keys(this.instances).forEach(k => {
      if (this.instances[k]) {
        this.instances[k].destroy();
      }
    });
    this.instances = {};
  },

  // Dashboard & Progress Line Chart
  initProgressLineChart: function(elementId) {
    const canvas = document.getElementById(elementId);
    if (!canvas) return;

    if (this.instances[elementId]) {
      this.instances[elementId].destroy();
    }

    this.instances[elementId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: ['07/08', '08/08', '09/08', '10/08'],
        datasets: [
          { label: 'Kế hoạch', data: [34, 68, 102, 136], borderColor: '#757575', borderDash: [4, 4], borderWidth: 1.5, fill: false, pointRadius: 3 },
          { label: 'Thực tế', data: [38, 76, 114, 136], borderColor: '#20B7A6', borderWidth: 2, fill: false, pointRadius: 3 },
          { label: 'OK', data: [37, 75, 112, 134], borderColor: '#4CAF50', borderWidth: 1.5, fill: false, pointRadius: 2 },
          { label: 'NG', data: [1, 1, 1, 1], borderColor: '#E53935', borderWidth: 1.5, fill: false, pointRadius: 2 },
          { label: 'Đã sửa', data: [0, 0, 1, 1], borderColor: '#8E24AA', borderWidth: 1.5, fill: false, pointRadius: 2 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } }
        },
        scales: {
          x: { ticks: { font: { size: 10 } }, grid: { color: '#E5E8E8' } },
          y: { ticks: { font: { size: 10 } }, grid: { color: '#E5E8E8' } }
        }
      }
    });
  },

  // Analysis Bar & Line Overlay Chart
  initAnalysisChart: function(elementId) {
    const canvas = document.getElementById(elementId);
    if (!canvas) return;

    if (this.instances[elementId]) {
      this.instances[elementId].destroy();
    }

    const store = window.CatStore;
    const labels = store.analysisData.map(d => d.target);
    const okData = store.analysisData.map(d => d.ok);
    const ngData = store.analysisData.map(d => d.ng);
    const fixedData = store.analysisData.map(d => d.fixed);
    const issueData = store.analysisData.map(d => d.issues);

    this.instances[elementId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { type: 'bar', label: 'OK', data: okData, backgroundColor: '#20B7A6', stack: 'Stack 0' },
          { type: 'bar', label: 'NG', data: ngData, backgroundColor: '#E53935', stack: 'Stack 0' },
          { type: 'bar', label: 'Đã sửa', data: fixedData, backgroundColor: '#8E24AA', stack: 'Stack 0' },
          { type: 'line', label: 'Số Issue', data: issueData, borderColor: '#FB8C00', borderWidth: 2, fill: false, yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } }
        },
        scales: {
          x: { ticks: { font: { size: 9 }, maxRotation: 45 }, grid: { display: false } },
          y: { stacked: true, ticks: { font: { size: 10 } }, grid: { color: '#E5E8E8' } },
          y1: { position: 'right', ticks: { font: { size: 10 } }, grid: { display: false } }
        }
      }
    });
  }
};
